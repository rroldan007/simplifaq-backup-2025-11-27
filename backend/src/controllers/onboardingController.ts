import { Request, Response } from 'express';
import {
  getOnboardingStatus,
  completeOnboardingStep,
  skipOnboardingStep,
  resetOnboarding,
  autoUpdateOnboarding,
  markWelcomeMessageShown,
  OnboardingStep
} from '../services/onboardingService';
import { ApiResponse } from '../types';

/**
 * Get current onboarding status
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    const status = await autoUpdateOnboarding(userId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get onboarding status'
      }
    } as ApiResponse);
  }
}

/**
 * Complete an onboarding step
 */
export async function completeStep(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { step } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    if (!step) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STEP',
          message: 'Step is required'
        }
      } as ApiResponse);
      return;
    }

    const status = await completeOnboardingStep(userId, step as OnboardingStep);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error completing step:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete step'
      }
    } as ApiResponse);
  }
}

/**
 * Skip an onboarding step
 */
export async function skipStep(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { step } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    if (!step) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STEP',
          message: 'Step is required'
        }
      } as ApiResponse);
      return;
    }

    const status = await skipOnboardingStep(userId, step as OnboardingStep);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error skipping step:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to skip step'
      }
    } as ApiResponse);
  }
}

/**
 * Reset onboarding
 */
export async function reset(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    const status = await resetOnboarding(userId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error resetting:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reset onboarding'
      }
    } as ApiResponse);
  }
}

/**
 * Mark welcome message as shown
 */
export async function markWelcomeShown(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    const status = await markWelcomeMessageShown(userId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error marking welcome as shown:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to mark welcome as shown'
      }
    } as ApiResponse);
  }
}

/**
 * Dismiss onboarding permanently (user chose "Ne plus afficher")
 */
export async function dismiss(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      } as ApiResponse);
      return;
    }

    const { dismissOnboarding } = await import('../services/onboardingService');
    const status = await dismissOnboarding(userId);

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('[Onboarding] Error dismissing onboarding:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to dismiss onboarding'
      }
    } as ApiResponse);
  }
}
