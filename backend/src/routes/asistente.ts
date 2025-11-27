import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import {
  chatWithAsistente,
  confirmAsistenteAction,
  analyzeExpenseWithAsistente,
  getAsistenteActions,
  getAsistenteActionDetails,
  cancelAsistenteAction,
  executeAsistenteAction,
} from '../controllers/asistenteController';

const router = Router();
const publicRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Public routes defined directly in main router (before any middleware)
router.get('/status', (req, res) => {
  console.log('🤖 ASISTENTE PUBLIC ROUTE: /status accessed directly');
  res.json({ success: true, message: 'Asistente routes are loaded and working' });
});

// Authentication required for specific routes
router.post('/chat', authenticateToken, chatWithAsistente);
router.post('/actions/confirm', authenticateToken, confirmAsistenteAction);
router.post('/expenses/analyze', authenticateToken, upload.single('file'), analyzeExpenseWithAsistente);
router.get('/actions', authenticateToken, getAsistenteActions);
router.get('/actions/:actionId', authenticateToken, getAsistenteActionDetails);
router.post('/actions/:actionId/cancel', authenticateToken, cancelAsistenteAction);
router.post('/actions/:actionId/execute', authenticateToken, executeAsistenteAction);

export default router;
