import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import productRoutes from './products';
import invoiceRoutes from './invoices';
import quoteRoutes from './quotes';
import reportRoutes from './reports';
import expensesRoutes from './expenses';
import emailRoutes from './email';
import csvImportRoutes from './csvImport';
import entitlementsRoutes from './entitlements';
import asistenteRoutes from './asistente'; // OBSOLETE: Being replaced by Pierre
import pierreRoutes from './pierre'; // NEW: Pierre AI Assistant
import settingsRoutes from './settings';
import uploadRoutes from './upload';
import auditRoutes from './audit';
import logoRoutes from './logoRoutes';
import adminRoutes from './admin';
import geoRoutes from './geo';
import notificationRoutes from './notificationRoutes';
import backupRoutes from './backupRoutes';
import userSmtpRoutes from './userSmtp';
import billingRoutes from './billing';
import invoiceV2Routes from './invoicesV2';
import templateRoutes from './templates';
import aiRoutes from './ai';
import tvaRatesRoutes from './tvaRates';
import onboardingRoutes from './onboarding';
import userSubscriptionRoutes from './userSubscriptions';
// import feedbackRoutes from './feedback'; // Comentado: modelo Feedback no existe en schema
import plansRoutes from './plans';
import { getAvailablePlans } from '../controllers/userSubscriptionController';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      message: 'Simplifaq API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Client routes
router.use('/clients', clientRoutes);

// Invoice routes
router.use('/invoices', invoiceRoutes);

// Quote routes (handled via invoices with isQuote=true)
router.use('/quotes', quoteRoutes);

// V2 Invoice routes with feature flags
router.use('/v2/invoices', invoiceV2Routes);

// Product routes
router.use('/products', productRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Expenses (Charges) routes
router.use('/expenses', expensesRoutes);

// Email routes
router.use('/email', emailRoutes);

// Asistente ADM routes (OBSOLETE - Use Pierre instead)
router.use('/asistente', asistenteRoutes);

// Pierre AI Assistant routes (NEW)
router.use('/pierre', pierreRoutes);

// CSV Import routes
router.use('/csv-import', csvImportRoutes);

// Entitlements routes
router.use('/entitlements', entitlementsRoutes);

// Upload routes
router.use('/upload', uploadRoutes);

// Audit routes for security logging and monitoring
router.use('/audit', auditRoutes);

// Logo routes for company branding
router.use('/logo', logoRoutes);

// Admin routes (auth, users, subscriptions, analytics, tva)
router.use('/admin', adminRoutes);

// Geo proxy routes (geo.admin.ch with Nominatim fallback)
router.use('/geo', geoRoutes);

// Settings routes (user configuration)
router.use('/settings', settingsRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Backup routes
router.use('/backups', backupRoutes);

// User SMTP routes (personalized email configuration)
router.use('/user/smtp', userSmtpRoutes);

// Billing routes (subscriptions, payments, Stripe)
router.use('/billing', billingRoutes);

// Template routes (invoice templates)
router.use('/templates', templateRoutes);

// AI Assistant routes (AI-powered features)
router.use('/ai', aiRoutes);

// TVA Rates routes (canton-based TVA rates)
router.use('/tva-rates', tvaRatesRoutes);

// Onboarding routes (user onboarding flow)
router.use('/onboarding', onboardingRoutes);

// User Subscription routes (plans, checkout, billing portal)
router.use('/subscriptions', userSubscriptionRoutes);

// Feedback routes (beta user feedback)
// router.use('/feedback', feedbackRoutes); // Comentado: modelo Feedback no existe en schema

// Public plans routes (no auth required for /public endpoints)
router.use('/plans', plansRoutes);

export default router;
