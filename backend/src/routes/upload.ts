import { Router } from 'express';
import { uploadLogo, upload, uploadPdfBackgroundImage, uploadPdfBackground } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /upload/logo - Subir logo de empresa
router.post('/logo', authenticateToken, upload.single('file'), uploadLogo);

// POST /uploads/logos - Ruta alternativa que coincide con el directorio estático
router.post('/uploads/logos', authenticateToken, upload.single('file'), uploadLogo);

// POST /upload/pdf-background - Subir imagen de fondo para PDF
router.post('/pdf-background', authenticateToken, uploadPdfBackground.single('file'), uploadPdfBackgroundImage);

export default router;
