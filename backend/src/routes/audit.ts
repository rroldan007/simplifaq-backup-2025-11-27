/**
 * Audit Routes for Security Logging and Monitoring
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../middleware/security';
import { body, query } from 'express-validator';
import {
  logUserInteraction,
  logFormDataEvent,
  getSecurityMetrics,
  logPerformanceMetric
} from '../controllers/auditController';

const router = Router();

// Validation rules for user interaction logging
const userInteractionValidation = [
  body('action')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Action must be a string between 1 and 100 characters'),
  body('component')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Component must be a string between 1 and 100 characters'),
  body('userId')
    .optional()
    .isString()
    .withMessage('UserId must be a string'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('SessionId must be a string'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Validation rules for form data event logging
const formDataEventValidation = [
  body('formId')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('FormId must be a string between 1 and 100 characters'),
  body('action')
    .isIn(['preserve', 'restore', 'expire', 'cleanup'])
    .withMessage('Action must be one of: preserve, restore, expire, cleanup'),
  body('dataSize')
    .isInt({ min: 0 })
    .withMessage('DataSize must be a non-negative integer'),
  body('userId')
    .optional()
    .isString()
    .withMessage('UserId must be a string'),
  body('sessionId')
    .optional()
    .isString()
    .withMessage('SessionId must be a string'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Validation rules for performance metrics
const performanceMetricValidation = [
  body('operation')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Operation must be a string between 1 and 100 characters'),
  body('duration')
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Validation rules for security metrics query
const securityMetricsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('StartDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('EndDate must be a valid ISO 8601 date')
];

/**
 * @route POST /api/audit/user-interaction
 * @desc Log user interaction event
 * @access Private (requires authentication)
 */
router.post(
  '/user-interaction',
  authenticateToken,
  validateInput(userInteractionValidation),
  logUserInteraction
);

/**
 * @route POST /api/audit/form-data
 * @desc Log form data preservation/restoration event
 * @access Private (requires authentication)
 */
router.post(
  '/form-data',
  authenticateToken,
  validateInput(formDataEventValidation),
  logFormDataEvent
);

/**
 * @route POST /api/audit/performance
 * @desc Log performance metric
 * @access Private (requires authentication)
 */
router.post(
  '/performance',
  authenticateToken,
  validateInput(performanceMetricValidation),
  logPerformanceMetric
);

/**
 * @route GET /api/audit/security-metrics
 * @desc Get security metrics for monitoring dashboard
 * @access Private (requires authentication)
 */
router.get(
  '/security-metrics',
  authenticateToken,
  validateInput(securityMetricsValidation),
  getSecurityMetrics
);

export default router;
