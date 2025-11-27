import { Router } from 'express';
import { AdminAuthController } from '../../controllers/adminAuthController';
import { adminAuth, requireRole, adminRateLimit, auditLog } from '../../middleware/adminAuth';

const router = Router();

// Apply rate limiting to all admin auth routes (disabled in development)
if (process.env.NODE_ENV !== 'development') {
  router.use(adminRateLimit(20, 15 * 60 * 1000)); // 20 requests per 15 minutes
}

// Public routes (no authentication required)
router.post('/login', AdminAuthController.login);

// Protected routes (authentication required)
router.use(adminAuth);

router.post('/logout', AdminAuthController.logout);
router.get('/profile', AdminAuthController.getProfile);

// 2FA routes
router.post('/2fa/setup', AdminAuthController.setup2FA);
router.post('/2fa/enable', auditLog('two_factor_enabled', 'admin_user'), AdminAuthController.enable2FA);
router.post('/2fa/disable', auditLog('two_factor_disabled', 'admin_user'), AdminAuthController.disable2FA);

// Super admin only routes
router.post('/create', 
  requireRole(['super_admin']), 
  auditLog('admin_created', 'admin_user'), 
  AdminAuthController.createAdmin
);

export default router;