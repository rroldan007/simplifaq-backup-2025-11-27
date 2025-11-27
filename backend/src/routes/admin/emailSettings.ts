import { Router } from 'express';
import {
  getEmailSettings,
  updateEmailSettings,
  getEmailTemplates,
  getEmailLogs,
} from '../../controllers/emailSettingsController';

const router = Router();

/**
 * Email Settings Routes (Admin Only)
 * Base path: /api/admin/email-settings
 */

router.get('/', getEmailSettings);
router.put('/', updateEmailSettings);
router.get('/templates', getEmailTemplates);
router.get('/logs', getEmailLogs);

export default router;
