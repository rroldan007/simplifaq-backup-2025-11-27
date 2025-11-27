import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { auditLogger } from '../middleware/security';
import { updateInvoicingNumbering, updateQuantityDecimals } from '../controllers/settingsController';

const router = Router();

/**
 * @route PATCH /api/settings/invoicing-numbering
 * @desc Met à jour la numérotation des factures (préfixe, prochain numéro, padding)
 * @access Privé
 */
router.patch(
  '/invoicing-numbering',
  authenticateToken,
  auditLogger('SETTINGS_UPDATE_INVOICING_NUMBERING'),
  updateInvoicingNumbering
);

/**
 * @route PATCH /api/settings/quantity-decimals
 * @desc Met à jour la précision des quantités (2 ou 3 décimales)
 * @access Privé
 */
router.patch(
  '/quantity-decimals',
  authenticateToken,
  auditLogger('SETTINGS_UPDATE_QUANTITY_DECIMALS'),
  updateQuantityDecimals
);

export default router;
