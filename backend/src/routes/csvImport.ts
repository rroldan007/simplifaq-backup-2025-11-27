/**
 * 🇨🇭 CSV Import Routes - File Upload and Processing
 * 
 * API endpoints for handling CSV file uploads and processing
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { CSVImportService } from '../services/csvImportService';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers CSV sont acceptés'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/csv-import/parse
 * Parse and validate CSV file content
 */
router.post('/parse', upload.single('csvFile'), async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Aucun fichier CSV fourni'
        }
      });
    }

    // Validate file
    const fileValidation = CSVImportService.validateFile(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: fileValidation.error
        }
      });
    }

    // Get canton code from user or default
    let cantonCode = 'GE'; // Default to Geneva
    // For now, we'll use the default canton code since the user object doesn't have a canton property
    // If you need to store canton information for users, you'll need to add it to the User model
    // and update the authentication middleware to include it in the user object
    
    // Parse CSV content
    const csvContent = req.file.buffer.toString('utf-8');
    const parseResult = CSVImportService.parseCSV(csvContent, cantonCode);

    if (!parseResult.success && parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Erreurs détectées dans le fichier CSV',
          details: parseResult.errors
        },
        data: {
          summary: parseResult.summary,
          errors: parseResult.errors
        }
      });
    }

    return res.json({
      success: true,
      message: `${parseResult.items.length} articles importés avec succès`,
      data: {
        items: parseResult.items,
        summary: parseResult.summary,
        errors: parseResult.errors
      }
    });

  } catch (error) {
    console.error('CSV parse error:', error);
    
    if (error instanceof multer.MulterError) {
      let message = 'Erreur lors du téléchargement du fichier';
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = 'Fichier trop volumineux (max 10MB)';
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        message = 'Trop de fichiers (max 1)';
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur'
      }
    });
  }
});

/**
 * GET /api/csv-import/template
 * Download CSV template file
 */
router.get('/template', (req, res): void => {
  try {
    const template = CSVImportService.generateTemplate();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="template_facture_simplifaq.csv"');
    res.send('\ufeff' + template); // Add BOM for proper UTF-8 encoding in Excel
    
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la génération du template'
      }
    });
  }
});

/**
 * POST /api/csv-import/validate
 * Validate CSV content without file upload (for frontend preview)
 */
router.post('/validate', (req, res): void => {
  try {
    const { csvContent, cantonCode } = req.body;
    
    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT',
          message: 'Contenu CSV manquant ou invalide'
        }
      });
      return;
    }

    const parseResult = CSVImportService.parseCSV(csvContent, cantonCode || 'GE');
    
    res.json({
      success: true,
      data: {
        items: parseResult.items,
        summary: parseResult.summary,
        errors: parseResult.errors,
        isValid: parseResult.success
      }
    });

  } catch (error) {
    console.error('CSV validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la validation'
      }
    });
  }
});

export default router;
