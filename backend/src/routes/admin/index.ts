/**
 * 🇨🇭 Admin Routes Index
 * 
 * Centralized admin routes configuration
 */

import { Router } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import subscriptionsRoutes from './subscriptions';
import analyticsRoutes from './analytics'; // ENABLED
import tvaRoutes from './tva';
import monitoringRoutes from './monitoring';
import communicationRoutes from './communication';
import templatesRoutes from './templates';
// import reportsRoutes from './reports'; // TODO: Disabled - depends on reportController
import plansRoutes from './plans';
import smtpRoutes from '../adminSmtp';
import emailSettingsRoutes from './emailSettings';
import backupsRoutes from './backups';

const router = Router();

// Mount admin routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/plans', plansRoutes);
router.use('/analytics', analyticsRoutes); // ENABLED
router.use('/tva', tvaRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/communication', communicationRoutes);
router.use('/templates', templatesRoutes);
// router.use('/reports', reportsRoutes); // TODO: Disabled
router.use('/smtp', smtpRoutes);
router.use('/email-settings', emailSettingsRoutes);
router.use('/backups', backupsRoutes);

export default router;