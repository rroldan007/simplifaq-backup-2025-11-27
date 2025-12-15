import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as onboardingController from '../controllers/onboardingController';

const router = Router();

// All onboarding routes require authentication
router.use(authenticateToken);

// Get current onboarding status
router.get('/status', onboardingController.getStatus);

// Complete an onboarding step
router.post('/complete', onboardingController.completeStep);

// Skip an onboarding step
router.post('/skip', onboardingController.skipStep);

// Reset onboarding
router.post('/reset', onboardingController.reset);

// Mark welcome message as shown
router.post('/welcome-shown', onboardingController.markWelcomeShown);

export default router;
