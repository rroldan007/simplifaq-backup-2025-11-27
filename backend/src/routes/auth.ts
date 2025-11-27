import { Router } from 'express';
import { registerCompany, login, getProfile, logout, updateProfile, refreshToken, changePassword, confirmEmail, resendConfirmationEmail } from '../controllers/authController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';
import { authenticateToken, rateLimitAuth } from '../middleware/auth';
import { 
  authRateLimit, 
  authSlowDown, 
  validateInput, 
  swissValidationRules,
  auditLogger 
} from '../middleware/security';

const router = Router();

// In development, bypass strict auth rate limiting to ease testing
const noopMiddleware = (_req: any, _res: any, next: any) => next();
const authLimiter = process.env.NODE_ENV === 'development' ? noopMiddleware : authRateLimit;

/**
 * @route POST /api/auth/register
 * @desc Register a new Swiss company
 * @access Public
 */
router.post('/register', 
  authLimiter,
  authSlowDown,
  validateInput([
    swissValidationRules.email,
    swissValidationRules.vatNumber,
    swissValidationRules.postalCode,
    swissValidationRules.sanitizeText
  ]),
  auditLogger('COMPANY_REGISTRATION'),
  registerCompany
);

/**
 * @route GET /api/auth/confirm-email
 * @desc Confirm email address (LPD compliance)
 * @access Public
 */
router.get('/confirm-email',
  authLimiter,
  auditLogger('EMAIL_CONFIRMATION'),
  confirmEmail
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', 
  authLimiter,
  authSlowDown,
  validateInput([
    swissValidationRules.email
  ]),
  auditLogger('USER_LOGIN'),
  login
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', 
  authenticateToken, 
  auditLogger('PROFILE_ACCESS'),
  getProfile
);

/**
 * @route PUT /api/auth/me
 * @desc Update current user profile
 * @access Private
 */
router.put('/me',
  authenticateToken,
  auditLogger('PROFILE_UPDATE'),
  updateProfile
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  authLimiter,
  validateInput([]),
  auditLogger('TOKEN_REFRESH'),
  refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', 
  authenticateToken, 
  auditLogger('USER_LOGOUT'),
  logout
);

/**
 * @route POST /api/auth/change-password
 * @desc Change current user's password
 * @access Private
 */
router.post('/change-password',
  authenticateToken,
  auditLogger('CHANGE_PASSWORD'),
  changePassword
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset email
 * @access Public
 */
router.post('/forgot-password',
  authLimiter,
  validateInput([
    swissValidationRules.email
  ]),
  auditLogger('FORGOT_PASSWORD'),
  forgotPassword
);

/**
 * @route POST /api/auth/resend-confirmation
 * @desc Resend email confirmation
 * @access Public
 */
router.post('/resend-confirmation',
  authLimiter,
  validateInput([
    swissValidationRules.email
  ]),
  auditLogger('RESEND_CONFIRMATION'),
  resendConfirmationEmail
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password',
  authLimiter,
  auditLogger('RESET_PASSWORD'),
  resetPassword
);

export default router;