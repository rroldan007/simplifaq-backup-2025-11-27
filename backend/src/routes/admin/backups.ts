import { Router } from 'express';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup
} from '../../controllers/backupController';

const router = Router();

/**
 * Admin Backup Routes
 * Base path: /api/admin/backups
 */

/**
 * @route   GET /api/admin/backups
 * @desc    List all backups
 * @access  Admin
 */
router.get('/', listBackups);

/**
 * @route   POST /api/admin/backups
 * @desc    Create new backup
 * @access  Admin
 */
router.post('/', createBackup);

/**
 * @route   POST /api/admin/backups/:filename/restore
 * @desc    Restore a backup
 * @access  Admin
 */
router.post('/:filename/restore', restoreBackup);

/**
 * @route   DELETE /api/admin/backups/:filename
 * @desc    Delete a backup
 * @access  Admin
 */
router.delete('/:filename', deleteBackup);

export default router;
