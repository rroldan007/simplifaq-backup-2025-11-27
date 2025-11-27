import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { EntitlementsService } from '../services/entitlementsService';

const router = Router();

router.use(authenticateToken);

// GET /api/entitlements/me
router.get('/me', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } });
    }

    const snapshot = await EntitlementsService.getUsageSnapshot(userId);
    return res.json({ success: true, data: snapshot });
  } catch (error: any) {
    console.error('Entitlements /me error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
  }
});

export default router;
