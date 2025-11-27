import { Router } from 'express';
import { uploadLogo, upload } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /upload/logo - Subir logo de empresa
router.post('/logo', authenticateToken, upload.single('file'), uploadLogo);

export default router;
