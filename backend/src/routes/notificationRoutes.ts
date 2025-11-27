import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applique le middleware d'authentification à toutes les routes de notification
router.use(authenticateToken);

// Route pour obtenir toutes les notifications de l'utilisateur
router.get('/', getNotifications);

// Route pour marquer une notification comme lue
router.post('/:id/read', markAsRead);

export default router;