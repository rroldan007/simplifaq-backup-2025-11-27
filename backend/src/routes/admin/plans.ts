import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { adminAuth, requirePermission, auditLog } from '../../middleware/adminAuth';

const prisma = new PrismaClient();
const router = Router();

// Protect all routes
router.use(adminAuth);

// Schemas
const planCreateSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  currency: z.string().default('CHF'),
  isActive: z.boolean().optional().default(true),
  maxInvoicesPerMonth: z.coerce.number().int().nonnegative().default(10),
  maxClientsTotal: z.coerce.number().int().nonnegative().default(50),
  maxProductsTotal: z.coerce.number().int().nonnegative().default(20),
  hasEmailSupport: z.boolean().optional().default(false),
  hasPrioritySupport: z.boolean().optional().default(false),
  hasAdvancedReports: z.boolean().optional().default(false),
  hasApiAccess: z.boolean().optional().default(false),
  hasCustomBranding: z.boolean().optional().default(false),
  storageLimit: z.coerce.number().int().nonnegative().default(100),
  hasSwissQRBill: z.boolean().optional().default(true),
  hasMultiCurrency: z.boolean().optional().default(false),
  hasMultiLanguage: z.boolean().optional().default(false),
  entitlements: z
    .array(
      z.object({
        features: z.any().optional(),
        limits: z.any().optional(),
        stripePriceId: z.string().optional(),
        isActive: z.boolean().optional().default(true),
      })
    )
    .optional(),
});

const planUpdateSchema = planCreateSchema.partial();

// GET /api/admin/plans - list plans
router.get('/', requirePermission('subscriptions', 'read'), async (_req, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        price: true,
        currency: true,
        isActive: true,
        maxInvoicesPerMonth: true,
        maxClientsTotal: true,
        maxProductsTotal: true,
        hasEmailSupport: true,
        hasPrioritySupport: true,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        storageLimit: true,
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subscriptions: true,
          }
        }
      },
    });

    return res.json({ success: true, data: plans });
  } catch (error) {
    console.error('List plans error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
  }
});

// POST /api/admin/plans - create plan
router.post('/', requirePermission('subscriptions', 'write'), auditLog('plan_created', 'plan'), async (req, res: Response) => {
  try {
    const payload = planCreateSchema.parse(req.body);

    const created = await prisma.plan.create({
      data: {
        name: payload.name,
        displayName: payload.displayName,
        description: payload.description,
        price: payload.price as unknown as any,
        currency: payload.currency,
        isActive: payload.isActive,
        maxInvoicesPerMonth: payload.maxInvoicesPerMonth,
        maxClientsTotal: payload.maxClientsTotal,
        maxProductsTotal: payload.maxProductsTotal,
        hasEmailSupport: payload.hasEmailSupport,
        hasPrioritySupport: payload.hasPrioritySupport,
        hasAdvancedReports: payload.hasAdvancedReports,
        hasApiAccess: payload.hasApiAccess,
        hasCustomBranding: payload.hasCustomBranding,
        storageLimit: payload.storageLimit,
        hasSwissQRBill: payload.hasSwissQRBill,
        hasMultiCurrency: payload.hasMultiCurrency,
        hasMultiLanguage: payload.hasMultiLanguage,
        entitlements: payload.entitlements
          ? {
              create: payload.entitlements.map((e) => ({
                features: e.features as any,
                limits: e.limits as any,
                stripePriceId: e.stripePriceId,
                isActive: e.isActive ?? true,
              })),
            }
          : undefined,
      },
      include: { entitlements: true },
    });

    return res.json({ success: true, data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: error.issues } });
    }
    console.error('Create plan error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
  }
});

// PUT /api/admin/plans/:id - update plan
router.put('/:id', requirePermission('subscriptions', 'write'), auditLog('plan_updated', 'plan', (req) => req.params.id), async (req, res: Response) => {
  try {
    const { id } = req.params;
    const payload = planUpdateSchema.parse(req.body);

    // Update Plan fields
    const updated = await prisma.plan.update({
      where: { id },
      data: {
        name: payload.name,
        displayName: payload.displayName,
        description: payload.description,
        price: (payload.price as unknown as any) ?? undefined,
        currency: payload.currency,
        isActive: payload.isActive,
        maxInvoicesPerMonth: payload.maxInvoicesPerMonth,
        maxClientsTotal: payload.maxClientsTotal,
        maxProductsTotal: payload.maxProductsTotal,
        hasEmailSupport: payload.hasEmailSupport,
        hasPrioritySupport: payload.hasPrioritySupport,
        hasAdvancedReports: payload.hasAdvancedReports,
        hasApiAccess: payload.hasApiAccess,
        hasCustomBranding: payload.hasCustomBranding,
        storageLimit: payload.storageLimit,
        hasSwissQRBill: payload.hasSwissQRBill,
        hasMultiCurrency: payload.hasMultiCurrency,
        hasMultiLanguage: payload.hasMultiLanguage,
      },
      include: { entitlements: true },
    });

    // If entitlements provided, replace existing set
    if (payload.entitlements) {
      await prisma.planEntitlement.deleteMany({ where: { planId: id } });
      await prisma.planEntitlement.createMany({
        data: payload.entitlements.map((e) => ({
          planId: id,
          features: (e.features as any) ?? undefined,
          limits: (e.limits as any) ?? undefined,
          stripePriceId: e.stripePriceId,
          isActive: e.isActive ?? true,
        })),
      });
    }

    const result = await prisma.plan.findUnique({ where: { id }, include: { entitlements: true } });
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: error.issues } });
    }
    console.error('Update plan error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
  }
});

// DELETE /api/admin/plans/:id - delete plan (only if no subscriptions)
router.delete('/:id', requirePermission('subscriptions', 'write'), auditLog('plan_deleted', 'plan', (req) => req.params.id), async (req, res: Response) => {
  try {
    const { id } = req.params;

    const subs = await prisma.subscription.count({ where: { planId: id } });
    if (subs > 0) {
      return res.status(400).json({ success: false, error: { code: 'PLAN_IN_USE', message: 'Impossible de supprimer un plan utilisé par des abonnements' } });
    }

    await prisma.planEntitlement.deleteMany({ where: { planId: id } });
    await prisma.plan.delete({ where: { id } });

    return res.json({ success: true, message: 'Plan supprimé avec succès' });
  } catch (error) {
    console.error('Delete plan error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
  }
});

export default router;
