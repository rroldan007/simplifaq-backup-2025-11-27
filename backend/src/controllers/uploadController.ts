import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../services/database';

// Configurar multer para almacenamiento de logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

// Configurar multer para almacenamiento de imágenes de fondo PDF
const pdfBackgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'pdf-backgrounds');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const userId = (req as any).userId || (req as any).user?.id || 'anonymous';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `pdf-bg-${userId}-${uniqueSuffix}${ext}`);
  }
});

// Configurar filtros de archivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de archivo permitidos
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  
  console.log('[FILE-FILTER] Checking file:', file.originalname, 'MIME:', file.mimetype);
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('[FILE-FILTER] ✅ File accepted');
    cb(null, true);
  } else {
    console.error('[FILE-FILTER] ❌ File rejected. Invalid MIME type:', file.mimetype);
    const error: any = new Error('Type de fichier non autorisé. Formats acceptés: PNG, JPG, SVG');
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

// Configurar multer para logos
export const upload = multer({
  storage: logoStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (coincide con validación del frontend)
  }
});

// Configurar multer para imágenes de fondo PDF
export const uploadPdfBackground = multer({
  storage: pdfBackgroundStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para imágenes de fondo
  }
});

// Controlador para subir logo
export const uploadLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[UPLOAD] ==========================================');
    console.log('[UPLOAD] Upload logo request received');
    console.log('[UPLOAD] Content-Type:', req.headers['content-type']);
    console.log('[UPLOAD] User:', (req as any).user?.id);
    console.log('[UPLOAD] Body keys:', Object.keys(req.body));
    console.log('[UPLOAD] File object:', req.file);
    console.log('[UPLOAD] File originalname:', req.file?.originalname);
    console.log('[UPLOAD] ==========================================');
    
    if (!req.file) {
      console.error('[UPLOAD] ❌ No file provided - multer did not parse it');
      console.error('[UPLOAD] This means: wrong field name, or Content-Type missing boundary');
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucun fichier fourni'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Construir URL del archivo (ruta relativa para la BD)
    const logoPath = path.join('uploads', 'logos', req.file.filename);
    console.log('[UPLOAD] Logo path:', logoPath);
    
    // Actualizar usuario en la base de datos si está autenticado
    const userId = (req as any).user?.id;
    if (userId) {
      console.log('[UPLOAD] Updating user logoUrl in database...');
      try {
        await (prisma.user as any).update({
          where: { id: userId },
          data: { logoUrl: logoPath }
        });
        console.log('[UPLOAD] User logoUrl updated successfully');
      } catch (dbError) {
        console.error('[UPLOAD] Error updating user in database:', dbError);
        // No fallar el upload si falla la actualización de BD
      }
    }
    
    res.json({
      success: true,
      data: {
        url: logoPath,
        logoUrl: logoPath, // Para compatibilidad
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      },
      timestamp: new Date().toISOString()
    });
    
    console.log('[UPLOAD] Upload completed successfully');
  } catch (error) {
    console.error('[UPLOAD] Erreur lors du téléchargement du logo:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Erreur lors du téléchargement du fichier'
      },
      timestamp: new Date().toISOString()
    });
  }
};

// Controlador para subir imagen de fondo PDF
export const uploadPdfBackgroundImage = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[UPLOAD-PDF-BG] ==========================================');
    console.log('[UPLOAD-PDF-BG] Upload PDF background image request received');
    console.log('[UPLOAD-PDF-BG] Headers:', req.headers);
    console.log('[UPLOAD-PDF-BG] User ID:', (req as any).userId);
    console.log('[UPLOAD-PDF-BG] User object:', (req as any).user);
    console.log('[UPLOAD-PDF-BG] File:', req.file);
    console.log('[UPLOAD-PDF-BG] Body:', req.body);
    console.log('[UPLOAD-PDF-BG] ==========================================');
    
    if (!req.file) {
      console.error('[UPLOAD-PDF-BG] ❌ No file provided');
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucun fichier fourni'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Construir URL del archivo (ruta relativa para la BD)
    const imagePath = path.join('uploads', 'pdf-backgrounds', req.file.filename);
    console.log('[UPLOAD-PDF-BG] Image path:', imagePath);
    console.log('[UPLOAD-PDF-BG] Full path:', path.join(process.cwd(), imagePath));
    
    res.json({
      success: true,
      data: {
        url: imagePath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      },
      timestamp: new Date().toISOString()
    });
    
    console.log('[UPLOAD-PDF-BG] Upload completed successfully');
  } catch (error) {
    console.error('[UPLOAD-PDF-BG] Erreur lors du téléchargement:', error);
    console.error('[UPLOAD-PDF-BG] Error stack:', (error as Error).stack);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Erreur lors du téléchargement de l\'image de fond',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};
