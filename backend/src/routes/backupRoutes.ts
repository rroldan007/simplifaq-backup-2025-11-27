import { Router } from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup
} from '../controllers/backupController';
import { ApiResponse } from '../types';

const router = Router();

// Apply authentication to all backup routes
router.use(authenticateToken);

// Apply admin check to all backup routes
router.use((req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Accès refusé. Droits administrateur requis.',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la vérification des droits administrateur',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * @route   GET /api/backups
 * @desc    Obtener lista de todos los respaldos
 * @access  Admin
 */
router.get('/', listBackups);

/**
 * @route   POST /api/backups
 * @desc    Crear un nuevo respaldo
 * @access  Admin
 */
router.post('/', createBackup);

/**
 * @route   POST /api/backups/:filename/restore
 * @desc    Restaurar un respaldo
 * @access  Admin
 */
router.post('/:filename/restore', restoreBackup);

/**
 * @route   DELETE /api/backups/:filename
 * @desc    Eliminar un respaldo
 * @access  Admin
 */
router.delete('/:filename', deleteBackup);

export default router;
