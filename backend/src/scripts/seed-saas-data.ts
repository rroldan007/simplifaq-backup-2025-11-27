#!/usr/bin/env ts-node

/**
 * 🇨🇭 SimpliFaq - SaaS Data Seeding Script
 * 
 * This script populates the database with initial SaaS administration data:
 * - Default subscription plans
 * - System configuration
 * - Email templates
 * - Feature flags
 * - Admin user (if specified)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import chalk from 'chalk';

const prisma = new PrismaClient();

interface SeedOptions {
  createAdminUser?: boolean;
  adminEmail?: string;
  adminPassword?: string;
  resetData?: boolean;
}

class SaaSSeedManager {
  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async seedPlans() {
    this.log('🏷️  Seeding subscription plans...', 'info');

    const plans = [
      {
        name: 'free',
        displayName: 'Plan Gratuit',
        description: 'Parfait pour commencer avec la facturation suisse',
        price: 0.00,
        currency: 'CHF',
        maxInvoicesPerMonth: 5,
        maxClientsTotal: 10,
        maxProductsTotal: 5,
        hasEmailSupport: false,
        hasPrioritySupport: false,
        hasAdvancedReports: false,
        hasApiAccess: false,
        hasCustomBranding: false,
        storageLimit: 50, // MB
        hasSwissQRBill: true,
        hasMultiCurrency: false,
        hasMultiLanguage: false,
      },
      {
        name: 'basic',
        displayName: 'Plan Basique',
        description: 'Idéal pour les petites entreprises et freelancers',
        price: 19.90,
        currency: 'CHF',
        maxInvoicesPerMonth: 50,
        maxClientsTotal: 100,
        maxProductsTotal: 50,
        hasEmailSupport: true,
        hasPrioritySupport: false,
        hasAdvancedReports: true,
        hasApiAccess: false,
        hasCustomBranding: false,
        storageLimit: 500, // MB
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
      },
      {
        name: 'premium',
        displayName: 'Plan Premium',
        description: 'Solution complète pour les entreprises en croissance',
        price: 49.90,
        currency: 'CHF',
        maxInvoicesPerMonth: 500,
        maxClientsTotal: 1000,
        maxProductsTotal: 200,
        hasEmailSupport: true,
        hasPrioritySupport: true,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        storageLimit: 2000, // MB
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
      },
    ];

    for (const planData of plans) {
      await prisma.plan.upsert({
        where: { name: planData.name },
        update: planData,
        create: planData,
      });
      this.log(`✅ Plan created/updated: ${planData.displayName}`, 'success');
    }
  }

  async seedSystemConfig() {
    this.log('⚙️  Seeding system configuration...', 'info');

    const configs = [
      {
        key: 'maintenance_mode',
        value: { enabled: false, message: 'Maintenance en cours...' },
        description: 'Mode maintenance du système',
      },
      {
        key: 'max_users',
        value: { limit: 10000 },
        description: 'Limite maximale d\'utilisateurs',
      },
      {
        key: 'email_settings',
        value: {
          fromName: 'SimpliFaq',
          fromEmail: 'contact@simplifaq.ch',
          replyTo: 'support@simplifaq.ch',
        },
        description: 'Configuration des emails système',
      },
      {
        key: 'swiss_settings',
        value: {
          defaultCurrency: 'CHF',
          defaultLanguage: 'fr',
          supportedLanguages: ['fr', 'de', 'it', 'en'],
          tvaRates: {
            standard: 7.7,
            reduced: 2.5,
            special: 3.7,
            exempt: 0.0,
          },
        },
        description: 'Configuration spécifique à la Suisse',
      },
      {
        key: 'trial_settings',
        value: {
          enabled: true,
          durationDays: 14,
          planName: 'basic',
        },
        description: 'Configuration de la période d\'essai',
      },
      {
        key: 'backup_settings',
        value: {
          enabled: true,
          frequency: 'daily',
          retentionDays: 30,
          s3Bucket: 'simplifaq-backups',
        },
        description: 'Configuration des sauvegardes',
      },
      {
        key: 'security_settings',
        value: {
          passwordMinLength: 8,
          requireTwoFactor: false,
          sessionTimeoutMinutes: 1440, // 24 hours
          maxLoginAttempts: 5,
          lockoutDurationMinutes: 30,
        },
        description: 'Configuration de sécurité',
      },
    ];

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value, description: config.description },
        create: config,
      });
      this.log(`✅ System config created/updated: ${config.key}`, 'success');
    }
  }

  async seedEmailTemplates() {
    this.log('📧 Seeding email templates...', 'info');

    const templates = [
      {
        name: 'welcome',
        subject: 'Bienvenue chez SimpliFaq !',
        htmlContent: `
          <h1>Bienvenue chez SimpliFaq !</h1>
          <p>Bonjour {{firstName}},</p>
          <p>Nous sommes ravis de vous accueillir sur notre plateforme de facturation suisse.</p>
          <p>Votre compte a été créé avec succès. Vous pouvez maintenant :</p>
          <ul>
            <li>Créer vos premières factures conformes aux normes suisses</li>
            <li>Gérer vos clients et produits</li>
            <li>Générer des QR-factures automatiquement</li>
          </ul>
          <p><a href=\"{{loginUrl}}\">Se connecter à votre compte</a></p>
          <p>Cordialement,<br>L'équipe SimpliFaq</p>
        `,
        textContent: `
          Bienvenue chez SimpliFaq !
          
          Bonjour {{firstName}},
          
          Nous sommes ravis de vous accueillir sur notre plateforme de facturation suisse.
          
          Votre compte a été créé avec succès. Vous pouvez maintenant créer vos premières factures conformes aux normes suisses.
          
          Connectez-vous : {{loginUrl}}
          
          Cordialement,
          L'équipe SimpliFaq
        `,
        language: 'fr',
        variables: { firstName: 'string', loginUrl: 'string' },
      },
      {
        name: 'invoice_sent',
        subject: 'Votre facture {{invoiceNumber}} a été envoyée',
        htmlContent: `
          <h1>Facture envoyée avec succès</h1>
          <p>Bonjour {{firstName}},</p>
          <p>Votre facture <strong>{{invoiceNumber}}</strong> d'un montant de <strong>{{amount}} {{currency}}</strong> a été envoyée avec succès à {{clientEmail}}.</p>
          <p><strong>Détails de la facture :</strong></p>
          <ul>
            <li>Numéro : {{invoiceNumber}}</li>
            <li>Client : {{clientName}}</li>
            <li>Montant : {{amount}} {{currency}}</li>
            <li>Date d'échéance : {{dueDate}}</li>
          </ul>
          <p><a href=\"{{invoiceUrl}}\">Voir la facture</a></p>
          <p>Cordialement,<br>L'équipe SimpliFaq</p>
        `,
        textContent: `
          Facture envoyée avec succès
          
          Bonjour {{firstName}},
          
          Votre facture {{invoiceNumber}} d'un montant de {{amount}} {{currency}} a été envoyée avec succès à {{clientEmail}}.
          
          Détails :
          - Numéro : {{invoiceNumber}}
          - Client : {{clientName}}
          - Montant : {{amount}} {{currency}}
          - Date d'échéance : {{dueDate}}
          
          Voir la facture : {{invoiceUrl}}
          
          Cordialement,
          L'équipe SimpliFaq
        `,
        language: 'fr',
        variables: {
          firstName: 'string',
          invoiceNumber: 'string',
          amount: 'number',
          currency: 'string',
          clientEmail: 'string',
          clientName: 'string',
          dueDate: 'string',
          invoiceUrl: 'string',
        },
      },
      {
        name: 'payment_reminder',
        subject: 'Rappel de paiement - Facture {{invoiceNumber}}',
        htmlContent: `
          <h1>Rappel de paiement</h1>
          <p>Bonjour {{firstName}},</p>
          <p>Nous vous rappelons que la facture <strong>{{invoiceNumber}}</strong> d'un montant de <strong>{{amount}} {{currency}}</strong> est échue depuis le {{dueDate}}.</p>
          <p>Merci de procéder au paiement dans les plus brefs délais.</p>
          <p><strong>Détails de la facture :</strong></p>
          <ul>
            <li>Numéro : {{invoiceNumber}}</li>
            <li>Client : {{clientName}}</li>
            <li>Montant : {{amount}} {{currency}}</li>
            <li>Date d'échéance : {{dueDate}}</li>
            <li>Jours de retard : {{daysPastDue}}</li>
          </ul>
          <p><a href=\"{{invoiceUrl}}\">Voir la facture</a></p>
          <p>Cordialement,<br>L'équipe SimpliFaq</p>
        `,
        textContent: `
          Rappel de paiement
          
          Bonjour {{firstName}},
          
          Nous vous rappelons que la facture {{invoiceNumber}} d'un montant de {{amount}} {{currency}} est échue depuis le {{dueDate}}.
          
          Merci de procéder au paiement dans les plus brefs délais.
          
          Détails :
          - Numéro : {{invoiceNumber}}
          - Client : {{clientName}}
          - Montant : {{amount}} {{currency}}
          - Date d'échéance : {{dueDate}}
          - Jours de retard : {{daysPastDue}}
          
          Voir la facture : {{invoiceUrl}}
          
          Cordialement,
          L'équipe SimpliFaq
        `,
        language: 'fr',
        variables: {
          firstName: 'string',
          invoiceNumber: 'string',
          amount: 'number',
          currency: 'string',
          clientName: 'string',
          dueDate: 'string',
          daysPastDue: 'number',
          invoiceUrl: 'string',
        },
      },
      {
        name: 'subscription_created',
        subject: 'Votre abonnement {{planName}} est actif',
        htmlContent: `
          <h1>Abonnement activé !</h1>
          <p>Bonjour {{firstName}},</p>
          <p>Votre abonnement <strong>{{planName}}</strong> a été activé avec succès.</p>
          <p><strong>Détails de votre abonnement :</strong></p>
          <ul>
            <li>Plan : {{planName}}</li>
            <li>Prix : {{price}} {{currency}}/mois</li>
            <li>Factures par mois : {{maxInvoices}}</li>
            <li>Clients maximum : {{maxClients}}</li>
            <li>Prochaine facturation : {{nextBillingDate}}</li>
          </ul>
          <p>Profitez de toutes les fonctionnalités de votre plan !</p>
          <p><a href=\"{{dashboardUrl}}\">Accéder à votre tableau de bord</a></p>
          <p>Cordialement,<br>L'équipe SimpliFaq</p>
        `,
        textContent: `
          Abonnement activé !
          
          Bonjour {{firstName}},
          
          Votre abonnement {{planName}} a été activé avec succès.
          
          Détails :
          - Plan : {{planName}}
          - Prix : {{price}} {{currency}}/mois
          - Factures par mois : {{maxInvoices}}
          - Clients maximum : {{maxClients}}
          - Prochaine facturation : {{nextBillingDate}}
          
          Accéder à votre tableau de bord : {{dashboardUrl}}
          
          Cordialement,
          L'équipe SimpliFaq
        `,
        language: 'fr',
        variables: {
          firstName: 'string',
          planName: 'string',
          price: 'number',
          currency: 'string',
          maxInvoices: 'number',
          maxClients: 'number',
          nextBillingDate: 'string',
          dashboardUrl: 'string',
        },
      },
    ];

    for (const template of templates) {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
      this.log(`✅ Email template created/updated: ${template.name}`, 'success');
    }
  }

  async seedFeatureFlags() {
    this.log('🚩 Seeding feature flags...', 'info');

    const flags = [
      {
        name: 'new_dashboard',
        description: 'Nouveau tableau de bord avec analytics avancés',
        isEnabled: false,
        rolloutPercentage: 0,
        targetPlans: ['premium'],
        metadata: { version: '2.0', beta: true },
      },
      {
        name: 'advanced_reports',
        description: 'Rapports avancés avec export Excel/PDF',
        isEnabled: true,
        rolloutPercentage: 100,
        targetPlans: ['basic', 'premium'],
        metadata: { stable: true },
      },
      {
        name: 'api_access',
        description: 'Accès API REST pour intégrations',
        isEnabled: true,
        rolloutPercentage: 100,
        targetPlans: ['premium'],
        metadata: { version: 'v1', rateLimit: 1000 },
      },
      {
        name: 'multi_language',
        description: 'Support multilingue (DE, IT, EN)',
        isEnabled: true,
        rolloutPercentage: 100,
        targetPlans: ['basic', 'premium'],
        metadata: { languages: ['de', 'it', 'en'] },
      },
      {
        name: 'custom_branding',
        description: 'Personnalisation de la marque sur les factures',
        isEnabled: true,
        rolloutPercentage: 100,
        targetPlans: ['premium'],
        metadata: { logoUpload: true, colorCustomization: true },
      },
      {
        name: 'two_factor_auth',
        description: 'Authentification à deux facteurs',
        isEnabled: false,
        rolloutPercentage: 10,
        targetPlans: ['basic', 'premium'],
        metadata: { methods: ['totp', 'sms'] },
      },
    ];

    for (const flag of flags) {
      await prisma.featureFlag.upsert({
        where: { name: flag.name },
        update: flag,
        create: flag,
      });
      this.log(`✅ Feature flag created/updated: ${flag.name}`, 'success');
    }
  }

  async createAdminUser(email: string, password: string) {
    this.log('👤 Creating admin user...', 'info');

    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = await prisma.adminUser.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        permissions: {
          users: ['read', 'write', 'delete'],
          subscriptions: ['read', 'write', 'delete'],
          plans: ['read', 'write', 'delete'],
          system: ['read', 'write', 'delete'],
          support: ['read', 'write', 'delete'],
          analytics: ['read'],
        },
        isActive: true,
      },
    });

    this.log(`✅ Admin user created/updated: ${adminUser.email}`, 'success');
    return adminUser;
  }

  async resetData() {
    this.log('🗑️  Resetting SaaS data...', 'warning');

    // Delete in correct order to respect foreign key constraints
    await prisma.supportResponse.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.adminLog.deleteMany();
    await prisma.billingLog.deleteMany();
    await prisma.usageRecord.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.emailTemplate.deleteMany();
    await prisma.featureFlag.deleteMany();

    this.log('✅ SaaS data reset completed', 'success');
  }

  async seed(options: SeedOptions = {}) {
    try {
      this.log('🇨🇭 Starting SaaS data seeding...', 'info');

      if (options.resetData) {
        await this.resetData();
      }

      await this.seedPlans();
      await this.seedSystemConfig();
      await this.seedEmailTemplates();
      await this.seedFeatureFlags();

      if (options.createAdminUser && options.adminEmail && options.adminPassword) {
        await this.createAdminUser(options.adminEmail, options.adminPassword);
      }

      this.log('🎉 SaaS data seeding completed successfully!', 'success');
    } catch (error) {
      this.log(`❌ Seeding failed: ${error}`, 'error');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--create-admin':
        options.createAdminUser = true;
        break;
      case '--admin-email':
        options.adminEmail = args[++i];
        break;
      case '--admin-password':
        options.adminPassword = args[++i];
        break;
      case '--reset':
        options.resetData = true;
        break;
      case '--help':
        console.log(`
🇨🇭 SimpliFaq SaaS Data Seeding Script

Usage: npm run seed:saas [options]

Options:
  --create-admin          Create a super admin user
  --admin-email EMAIL     Admin user email (required with --create-admin)
  --admin-password PASS   Admin user password (required with --create-admin)
  --reset                 Reset all SaaS data before seeding
  --help                  Show this help message

Examples:
  npm run seed:saas
  npm run seed:saas --create-admin --admin-email admin@simplifaq.ch --admin-password SecurePass123
  npm run seed:saas --reset --create-admin --admin-email admin@simplifaq.ch --admin-password SecurePass123
        `);
        process.exit(0);
    }
  }

  // Validate admin user options
  if (options.createAdminUser && (!options.adminEmail || !options.adminPassword)) {
    console.error('❌ --admin-email and --admin-password are required when using --create-admin');
    process.exit(1);
  }

  const seedManager = new SaaSSeedManager();
  await seedManager.seed(options);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { SaaSSeedManager };