import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type OnboardingStep = 
  | 'company_info' 
  | 'logo' 
  | 'financial' 
  | 'client' 
  | 'product' 
  | 'invoice'
  | 'completed';

export interface OnboardingStatus {
  id: string;
  userId: string;
  companyInfoCompleted: boolean;
  logoUploaded: boolean;
  financialInfoCompleted: boolean;
  firstClientCreated: boolean;
  firstProductCreated: boolean;
  firstInvoiceCreated: boolean;
  isCompleted: boolean;
  completedAt: Date | null;
  currentStep: string;
  skippedSteps: string[];
  progress: number;
  nextStep: OnboardingStep | null;
}

/**
 * Get or create onboarding status for a user
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  let onboarding = await prisma.userOnboarding.findUnique({
    where: { userId }
  });

  if (!onboarding) {
    onboarding = await prisma.userOnboarding.create({
      data: {
        userId,
        currentStep: 'company_info'
      }
    });
  }

  const progress = calculateProgress(onboarding);
  const nextStep = determineNextStep(onboarding);

  return {
    ...onboarding,
    progress,
    nextStep
  };
}

/**
 * Mark a step as completed
 */
export async function completeOnboardingStep(
  userId: string, 
  step: OnboardingStep
): Promise<OnboardingStatus> {
  const onboarding = await getOnboardingStatus(userId);

  const updateData: any = {};

  switch (step) {
    case 'company_info':
      updateData.companyInfoCompleted = true;
      updateData.currentStep = 'logo';
      break;
    case 'logo':
      updateData.logoUploaded = true;
      updateData.currentStep = 'financial';
      break;
    case 'financial':
      updateData.financialInfoCompleted = true;
      updateData.currentStep = 'client';
      break;
    case 'client':
      updateData.firstClientCreated = true;
      updateData.currentStep = 'product';
      break;
    case 'product':
      updateData.firstProductCreated = true;
      updateData.currentStep = 'invoice';
      break;
    case 'invoice':
      updateData.firstInvoiceCreated = true;
      updateData.currentStep = 'completed';
      updateData.isCompleted = true;
      updateData.completedAt = new Date();
      break;
  }

  const updated = await prisma.userOnboarding.update({
    where: { userId },
    data: updateData
  });

  const progress = calculateProgress(updated);
  const nextStep = determineNextStep(updated);

  return {
    ...updated,
    progress,
    nextStep
  };
}

/**
 * Skip a step
 */
export async function skipOnboardingStep(
  userId: string,
  step: OnboardingStep
): Promise<OnboardingStatus> {
  const onboarding = await getOnboardingStatus(userId);
  
  const skippedSteps = [...onboarding.skippedSteps, step];
  const nextStep = getNextStepAfterSkip(step);

  const updated = await prisma.userOnboarding.update({
    where: { userId },
    data: {
      skippedSteps,
      currentStep: nextStep
    }
  });

  const progress = calculateProgress(updated);
  const next = determineNextStep(updated);

  return {
    ...updated,
    progress,
    nextStep: next
  };
}

/**
 * Reset onboarding
 */
export async function resetOnboarding(userId: string): Promise<OnboardingStatus> {
  const updated = await prisma.userOnboarding.update({
    where: { userId },
    data: {
      companyInfoCompleted: false,
      logoUploaded: false,
      financialInfoCompleted: false,
      firstClientCreated: false,
      firstProductCreated: false,
      firstInvoiceCreated: false,
      isCompleted: false,
      completedAt: null,
      currentStep: 'company_info',
      skippedSteps: []
    }
  });

  return {
    ...updated,
    progress: 0,
    nextStep: 'company_info'
  };
}

/**
 * Auto-detect and update onboarding progress based on user data
 */
export async function autoUpdateOnboarding(userId: string): Promise<OnboardingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      clients: { take: 1 },
      products: { take: 1 },
      invoices: { take: 1 }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const onboarding = await getOnboardingStatus(userId);
  const updateData: any = {};

  // Check company info
  if (!onboarding.companyInfoCompleted && 
      user.companyName && user.street && user.city && user.postalCode) {
    updateData.companyInfoCompleted = true;
  }

  // Check logo
  if (!onboarding.logoUploaded && user.logoUrl) {
    updateData.logoUploaded = true;
  }

  // Check financial info
  if (!onboarding.financialInfoCompleted && user.iban) {
    updateData.financialInfoCompleted = true;
  }

  // Check first client
  if (!onboarding.firstClientCreated && user.clients.length > 0) {
    updateData.firstClientCreated = true;
  }

  // Check first product
  if (!onboarding.firstProductCreated && user.products.length > 0) {
    updateData.firstProductCreated = true;
  }

  // Check first invoice
  if (!onboarding.firstInvoiceCreated && user.invoices.length > 0) {
    updateData.firstInvoiceCreated = true;
  }

  // Update if there are changes
  if (Object.keys(updateData).length > 0) {
    const updated = await prisma.userOnboarding.update({
      where: { userId },
      data: updateData
    });

    const progress = calculateProgress(updated);
    const nextStep = determineNextStep(updated);

    // Check if all steps are completed
    if (progress === 100 && !updated.isCompleted) {
      await prisma.userOnboarding.update({
        where: { userId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          currentStep: 'completed'
        }
      });
    }

    return {
      ...updated,
      progress,
      nextStep
    };
  }

  return onboarding;
}

// Helper functions

function calculateProgress(onboarding: any): number {
  const steps = [
    onboarding.companyInfoCompleted,
    onboarding.logoUploaded,
    onboarding.financialInfoCompleted,
    onboarding.firstClientCreated,
    onboarding.firstProductCreated,
    onboarding.firstInvoiceCreated
  ];

  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
}

function determineNextStep(onboarding: any): OnboardingStep | null {
  if (onboarding.isCompleted) return null;

  if (!onboarding.companyInfoCompleted) return 'company_info';
  if (!onboarding.logoUploaded && !onboarding.skippedSteps.includes('logo')) return 'logo';
  if (!onboarding.financialInfoCompleted) return 'financial';
  if (!onboarding.firstClientCreated) return 'client';
  if (!onboarding.firstProductCreated) return 'product';
  if (!onboarding.firstInvoiceCreated) return 'invoice';

  return 'completed';
}

function getNextStepAfterSkip(step: OnboardingStep): OnboardingStep {
  const stepOrder: OnboardingStep[] = ['company_info', 'logo', 'financial', 'client', 'product', 'invoice', 'completed'];
  const currentIndex = stepOrder.indexOf(step);
  return stepOrder[currentIndex + 1] || 'completed';
}
