/**
 * 🇨🇭 Admin TVA Routes - Centralized TVA Management API
 * 
 * Admin endpoints for managing Swiss TVA rates by canton
 */

import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { adminAuth, AdminAuthRequest } from '../../middleware/adminAuth';
import { 
  SwissTVACategory, 
  updateCantonTVARates,
  getCantonTVAConfig,
  getSupportedCantons,
  SWISS_CANTON_TVA_CONFIG
} from '../../config/swissTaxConfig';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

/**
 * GET /api/admin/tva/cantons
 * Get all supported cantons
 */
router.get('/cantons', (req: AdminAuthRequest, res: Response): Response | void => {
  try {
    const cantons = getSupportedCantons();
    
    return res.json({
      success: true,
      data: cantons
    });
  } catch (error) {
    console.error('Get cantons error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

/**
 * GET /api/admin/tva/rates/:cantonCode
 * Get TVA rates for a specific canton
 */
router.get('/rates/:cantonCode', [
  param('cantonCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Code canton invalide')
], (req: AdminAuthRequest, res: Response): Response | void => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array()
        }
      });
    }

    const { cantonCode } = req.params;
    const config = getCantonTVAConfig(cantonCode);
    
    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get canton rates error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

/**
 * PUT /api/admin/tva/rates
 * Update TVA rate for a canton
 */
router.put('/rates', [
  body('cantonCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Code canton invalide'),
  body('category')
    .isIn(['EXEMPT', 'REDUCED', 'SPECIAL', 'STANDARD'])
    .withMessage('Catégorie TVA invalide'),
  body('rate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Taux TVA invalide (0-100%)'),
  body('label')
    .isLength({ min: 1, max: 100 })
    .withMessage('Libellé requis (max 100 caractères)'),
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description requise (max 500 caractères)')
], async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array()
        }
      });
    }

    const { cantonCode, category, rate, label, description } = req.body;

    // Check if canton exists
    if (!SWISS_CANTON_TVA_CONFIG[cantonCode]) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CANTON_NOT_FOUND',
          message: 'Canton non trouvé'
        }
      });
    }

    // Update the rate
    const newRate = {
      rate,
      label,
      description,
      effectiveFrom: new Date().toISOString().split('T')[0]
    };

    // Update in configuration
    const categoryKey = category.toLowerCase() as keyof typeof SWISS_CANTON_TVA_CONFIG[typeof cantonCode]['rates'];
    SWISS_CANTON_TVA_CONFIG[cantonCode].rates[categoryKey] = newRate;
    SWISS_CANTON_TVA_CONFIG[cantonCode].lastUpdated = new Date().toISOString().split('T')[0];

    // Log the admin action
    console.log(`Admin ${req.admin?.email} updated TVA rate for ${cantonCode} - ${category}: ${rate}%`);

    // In a real application, you would also:
    // 1. Save to database
    // 2. Create audit log entry
    // 3. Send notification to affected users
    // 4. Update cached configurations

    return res.json({
      success: true,
      message: 'Taux TVA mis à jour avec succès',
      data: {
        cantonCode,
        category,
        rate: newRate
      }
    });
  } catch (error) {
    console.error('Update TVA rate error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

/**
 * PUT /api/admin/tva/exemption-threshold
 * Update exemption threshold for a canton
 */
router.put('/exemption-threshold', [
  body('cantonCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Code canton invalide'),
  body('threshold')
    .isInt({ min: 0 })
    .withMessage('Seuil d\'exonération invalide')
], async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: errors.array()
        }
      });
    }

    const { cantonCode, threshold } = req.body;

    // Check if canton exists
    if (!SWISS_CANTON_TVA_CONFIG[cantonCode]) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CANTON_NOT_FOUND',
          message: 'Canton non trouvé'
        }
      });
    }

    // Update the threshold
    SWISS_CANTON_TVA_CONFIG[cantonCode].exemptionThreshold = threshold;
    SWISS_CANTON_TVA_CONFIG[cantonCode].lastUpdated = new Date().toISOString().split('T')[0];

    // Log the admin action
    console.log(`Admin ${req.admin?.email} updated exemption threshold for ${cantonCode}: ${threshold} CHF`);

    return res.json({
      success: true,
      message: 'Seuil d\'exonération mis à jour avec succès',
      data: {
        cantonCode,
        threshold
      }
    });
  } catch (error) {
    console.error('Update exemption threshold error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

/**
 * GET /api/admin/tva/audit-log
 * Get audit log of TVA rate changes
 */
router.get('/audit-log', (req: AdminAuthRequest, res: Response) => {
  try {
    // In a real application, you would fetch from database
    // For now, return mock data
    const auditLog = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        adminEmail: req.admin?.email,
        action: 'UPDATE_TVA_RATE',
        cantonCode: 'GE',
        category: 'STANDARD',
        oldRate: 7.7,
        newRate: 8.1,
        description: 'Mise à jour des taux TVA 2025'
      }
    ];

    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

export default router;