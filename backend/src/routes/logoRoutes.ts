import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../services/database';

// Note: Environment variables are already loaded in index.ts
// No need to reload them here as it may cause incorrect path resolution

const router = Router();

// Configure multer for logo uploads
// Use relative path in development, absolute in production
const uploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads', 'logos');

console.log('[LOGO] Upload directory configured:', uploadDir);
console.log('[LOGO] __dirname is:', __dirname);
console.log('[LOGO] process.cwd() is:', process.cwd());

// Ensure upload directory exists
try {
  const fsSync = require('fs');
  if (!fsSync.existsSync(uploadDir)) {
    console.log('[LOGO] Creating upload directory:', uploadDir);
    fsSync.mkdirSync(uploadDir, { recursive: true });
  } else {
    console.log('[LOGO] Upload directory exists');
  }
} catch (err) {
  console.error('[LOGO] Error checking/creating upload directory:', err);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[LOGO] Multer destination called, uploadDir:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
  }
});

// Error handler middleware for multer
const multerErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error('[LOGO] Multer error:', err.code, err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 5MB' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    console.error('[LOGO] Unknown upload error:', err);
    return res.status(500).json({ error: err.message || 'Unknown upload error' });
  }
  next();
};

// Upload company logo
router.post('/upload', authenticateToken, upload.single('logo'), multerErrorHandler, async (req: Request, res: Response, next: NextFunction) => {
  console.log('[LOGO] Upload request received');
  console.log('[LOGO] Auth user:', (req as any).user?.id);
  console.log('[LOGO] Request headers:', req.headers);
  console.log('[LOGO] Request body keys:', Object.keys(req.body));
  console.log('[LOGO] File received:', req.file?.originalname);
  console.log('[LOGO] req.file object:', req.file);
  
  try {
    if (!req.file) {
      console.error('[LOGO] No file uploaded - multer did not process the file');
      console.error('[LOGO] This could mean: wrong field name, file too large, or invalid file type');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log('[LOGO] Storing file at:', req.file.path);
    
    const userId = (req as any).user.id;
    const logoPath = path.join('uploads', 'logos', req.file.filename);

    console.log('[DEBUG] Upload request body:', req.body);
    console.log('[DEBUG] Uploaded file info:', req.file);
    console.log('[DEBUG] Updating user:', userId, 'with logo:', logoPath);
    
    // Update user's logoUrl in database
    const updatedUser = await (prisma.user as any).update({
      where: { id: userId },
      data: { logoUrl: logoPath },
      select: {
        id: true,
        companyName: true,
        email: true,
        firstName: true,
        lastName: true,
        vatNumber: true,
        phone: true,
        website: true,
        logoUrl: true,
        // Common flat address fields (if present in schema)
        street: true,
        postalCode: true,
        city: true,
        canton: true,
        country: true,
        quantityDecimals: true,
      }
    });

    console.log('[DEBUG] Updated user:', updatedUser);
    console.log('[LOGO] User updated successfully');
    console.info('[LOGO] Logo uploaded successfully', {
      userId,
      filename: req.file.filename,
      path: logoPath,
      size: req.file.size
    });

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: logoPath,
      user: updatedUser
    });

  } catch (error) {
    console.error('[LOGO] Upload failed:', error);
    // Pass error to the global error handler
    next(error);
  }
});

// Get current user's logo
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyName: true,
        email: true,
        firstName: true,
        lastName: true,
        vatNumber: true,
        phone: true,
        website: true,
        logoUrl: true,
        street: true,
        postalCode: true,
        city: true,
        canton: true,
        country: true,
        quantityDecimals: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const logoUrl = user.logoUrl || null;
    console.log('[DEBUG] Final response payload:', { logoUrl });
    res.json({
      logoUrl,
      companyName: user.companyName
    });

  } catch (error) {
    console.error('[LOGO] Get current logo failed', { error: (error as any)?.message || error });
    res.status(500).json({ 
      error: 'Failed to get logo',
      details: (error as any)?.message || 'Unknown error'
    });
    return;
  }
});

// Delete current user's logo
router.delete('/current', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        id: true,
        logoUrl: true
      }
    });

    if (user?.logoUrl) {
      // Delete file from filesystem
      try {
        const baseDir = process.env.UPLOADS_BASE_DIR || path.join(__dirname, '..', '..');
        const fullPath = path.join(baseDir, user.logoUrl);
        await fs.unlink(fullPath);
        console.info('[LOGO] Logo file deleted', { path: user.logoUrl });
      } catch (fileError) {
        console.warn('[LOGO] Could not delete logo file', { 
          path: user.logoUrl, 
          error: (fileError as any)?.message 
        });
      }
    }

    // Remove logoUrl from database
    const updatedUser = await (prisma.user as any).update({
      where: { id: userId },
      data: { logoUrl: null },
      select: {
        id: true,
        companyName: true,
        email: true,
        firstName: true,
        lastName: true,
        vatNumber: true,
        phone: true,
        website: true,
        logoUrl: true,
        street: true,
        postalCode: true,
        city: true,
        canton: true,
        country: true,
        quantityDecimals: true,
      }
    });

    res.json({
      success: true,
      message: 'Logo deleted successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('[LOGO] Delete logo failed', { error: (error as any)?.message || error });
    res.status(500).json({ 
      error: 'Failed to delete logo',
      details: (error as any)?.message || 'Unknown error'
    });
    return;
  }
});

export default router;
