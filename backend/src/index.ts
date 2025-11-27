console.log('🚀 [STARTUP] Backend starting...');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { prisma } from './services/database';
import routes from './routes';
import { 
  corsOptions, 
  apiRateLimit, 
  preventSQLInjection,
  securityLogger 
} from './middleware/security';
import { AsistenteClient } from './services/asistenteClient';
import { detectIntentAndGenerateActions, generateResponseFromResults } from './controllers/asistenteController';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(process.cwd(), envFile);
const envResult = dotenv.config({ path: envPath });

if (envResult.error && process.env.NODE_ENV === 'production') {
  console.warn(`[ENV] Failed to load ${envFile}:`, envResult.error.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Stripe webhook MUST be registered BEFORE express.json()
// because it needs the raw body for signature verification
import webhookRoutes from './routes/webhooks';
app.use('/api/webhooks', webhookRoutes);

// Essential Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directory exists
const ensureUploadsDirExists = async () => {
  const uploadDir = process.env.UPLOADS_DIR || '/var/www/simplifaq/my/backend/uploads/logos';
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
    console.log(`[INIT] Upload directory verified/created at: ${uploadDir}`);
  } catch (error) {
    console.error(`[INIT] Fatal error: Could not create upload directory.`, error);
    process.exit(1);
  }
};

ensureUploadsDirExists();

// TEST ROUTES - BEFORE ANY MIDDLEWARE
app.get('/test-get', (req, res) => {
  console.log('🎯 TEST GET route accessed');
  res.json({ success: true, message: 'GET works' });
});

// Apply CORS before other middleware
app.get('/api/asistente/status', (req, res) => {
  console.log('🎯 PUBLIC ROUTE: /api/asistente/status accessed');
  res.json({ success: true, message: 'Asistente routes are loaded and working' });
});

// API routes
app.use('/api', routes);

// Database health check route
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      message: 'Simplifaq API is running',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: {
//       code: 'NOT_FOUND',
//       message: 'Endpoint non trouvé',
//     },
//     timestamp: new Date().toISOString(),
//   });
// });

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[GLOBAL ERROR HANDLER] Caught error:', JSON.stringify(error, null, 2));
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Erreur interne du serveur';
  let code = error.code || 'INTERNAL_SERVER_ERROR';

  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Le fichier est trop volumineux. La taille maximale est de 5MB.';
    code = 'FILE_TOO_LARGE';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: code,
      message: message,
    },
    timestamp: new Date().toISOString(),
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Simplifaq API server running on port ${PORT}`);
  });
}

export default app;
