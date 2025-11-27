import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import geoRoutes from './routes/geo';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Disable ETag/conditional GET to avoid 304 with empty bodies in dev
app.set('etag', false);

// Configuración CORS para desarrollo
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://192.168.1.116:3000',
]);
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// (payments endpoint moved below after routes to ensure body parsing)

 

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Force no-cache to always send fresh JSON (avoid 304)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Ensure upload directory exists and serve static uploads
const ensureUploadsDirExists = async () => {
  const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
    console.log(`[INIT] Upload directory verified/created at: ${uploadDir}`);
  } catch (error) {
    console.error(`[INIT] Could not create upload directory`, error);
  }
};
void ensureUploadsDirExists();
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount geo proxy routes for address autocomplete
app.use('/api/geo', geoRoutes);

// Basic logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Dev auth shim: extract userId from dev-token or infer from invoice id param (dev convenience)
async function ensureDevUser(req: express.Request) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/dev-token-([^-]+)-/);
  let userId: string | null = m?.[1] || null;
  if (userId) {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (!exists) userId = null;
  }
  // If this request targets a specific invoice or quote id, try to infer the owner userId in dev
  try {
    const resourceId = (req.params as any)?.id;
    if (!userId && typeof resourceId === 'string' && resourceId.length > 0) {
      // Try invoice first
      const inv = await prisma.invoice.findUnique({ where: { id: resourceId }, select: { userId: true } });
      if (inv?.userId) {
        userId = inv.userId;
      }
    }
  } catch {}
  // ❌ REMOVED SECURITY FLAW: Do NOT auto-assign first user if no valid token
  // If no userId at this point, leave it null - endpoints should handle 401
  if (userId) {
    (req as any).userId = userId;
  }
}

// Apply dev auth shim globally so controllers expecting req.userId work in dev
app.use(async (req, _res, next) => {
  try {
    await ensureDevUser(req);
  } catch {}
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'development',
    database: 'sqlite'
  });
});

// Mount full API router
app.use('/api', routes);

// Catch all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint non trouvé' 
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Erreur interne du serveur' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🇨🇭 SimpliFaq Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: SQLite (dev.db)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;