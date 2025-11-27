import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Limits = {
  invoices: number;
  clients: number;
  products: number;
  storage: number;
  api_calls: number;
  quotes: number;
};

export type Entitlements = {
  features: Record<string, boolean>;
  limits: Limits;
  source: 'price' | 'plan' | 'trial' | 'fallback';
};

const TRIAL_DEFAULT: Entitlements = {
  features: {
    invoicing: true,
    swiss_qr_bill: true,
    email_support: false,
    priority_support: false,
    advanced_reports: false,
    api_access: false,
    custom_branding: false,
  },
  limits: { invoices: 3, clients: 0, products: 0, storage: 0, api_calls: 0, quotes: 3 },
  source: 'trial',
};

export class EntitlementsService {
  static async ensureDefaultTrialEntitlement() {
    const existing = await prisma.planEntitlement.findFirst({
      where: { planName: 'trial', isActive: true },
    });
    if (!existing) {
      await prisma.planEntitlement.create({
        data: {
          planName: 'trial',
          features: TRIAL_DEFAULT.features,
          limits: TRIAL_DEFAULT.limits,
          isActive: true,
        },
      });
    }
  }

  static async getEntitlementsForUser(userId: string): Promise<Entitlements> {
    await this.ensureDefaultTrialEntitlement();

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    // Prefer mapping by Stripe Price ID if present in future; for now we map by planId or fallback to trial
    if (subscription) {
      // Try planId mapping
      const byPlan = await prisma.planEntitlement.findFirst({
        where: { planId: subscription.planId, isActive: true },
      });
      if (byPlan) {
        return {
          features: (byPlan.features as Record<string, boolean>) || {},
          limits: (byPlan.limits as Limits) || TRIAL_DEFAULT.limits,
          source: 'plan',
        };
      }
    }

    // Trial (free users or no mapping yet)
    const trial = await prisma.planEntitlement.findFirst({
      where: { planName: 'trial', isActive: true },
    });
    if (trial) {
      return {
        features: (trial.features as Record<string, boolean>) || TRIAL_DEFAULT.features,
        limits: (trial.limits as Limits) || TRIAL_DEFAULT.limits,
        source: 'trial',
      };
    }

    // Fallback hardcoded
    return TRIAL_DEFAULT;
  }

  static async getUsageSnapshot(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        usageRecords: {
          where: { period: new Date().toISOString().slice(0, 7) },
        },
      },
    });

    const currentUsage = (subscription?.usageRecords || []).reduce((acc, r) => {
      acc[r.resourceType] = r.quantity;
      return acc;
    }, {} as Record<string, number>);

    const ent = await this.getEntitlementsForUser(userId);

    const usagePercentages = (Object.keys(ent.limits) as Array<keyof Limits>).reduce((acc, key) => {
      const used = currentUsage[key as string] || 0;
      const limit = ent.limits[key];
      acc[key] = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
      return acc;
    }, {} as Record<keyof Limits, number>);

    return { entitlements: ent, currentUsage, usagePercentages };
  }
}
