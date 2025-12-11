import { api } from './api';

export type OnboardingStep = 
  | 'company_info' 
  | 'logo' 
  | 'financial'
  | 'smtp'
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
  smtpConfigured: boolean;
  firstClientCreated: boolean;
  firstProductCreated: boolean;
  firstInvoiceCreated: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  currentStep: string;
  skippedSteps: string[];
  progress: number;
  nextStep: OnboardingStep | null;
  welcomeMessageShown: boolean;
  welcomeMessageShownAt: string | null;
}

export const onboardingApi = {
  /**
   * Get current onboarding status
   */
  getStatus: async (): Promise<OnboardingStatus> => {
    const response = await api.get<OnboardingStatus>('/onboarding/status');
    return response.data.data as OnboardingStatus;
  },

  /**
   * Complete an onboarding step
   */
  completeStep: async (step: OnboardingStep): Promise<OnboardingStatus> => {
    const response = await api.post<OnboardingStatus>('/onboarding/complete', { step });
    return response.data.data as OnboardingStatus;
  },

  /**
   * Skip an onboarding step
   */
  skipStep: async (step: OnboardingStep): Promise<OnboardingStatus> => {
    const response = await api.post<OnboardingStatus>('/onboarding/skip', { step });
    return response.data.data as OnboardingStatus;
  },

  /**
   * Reset onboarding
   */
  reset: async (): Promise<OnboardingStatus> => {
    const response = await api.post<OnboardingStatus>('/onboarding/reset');
    return response.data.data as OnboardingStatus;
  },

  /**
   * Mark welcome message as shown
   */
  markWelcomeShown: async (): Promise<OnboardingStatus> => {
    const response = await api.post<OnboardingStatus>('/onboarding/welcome-shown');
    return response.data.data as OnboardingStatus;
  }
};
