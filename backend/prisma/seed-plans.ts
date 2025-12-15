import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding plans...');

  // Eliminar planes existentes (opcional, comentar si no quieres borrar)
  // await prisma.plan.deleteMany({});

  // Plan Gratuit
  const freePlan = await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      name: 'free',
      displayName: 'Plan Gratuit',
      description: 'Parfait pour démarrer votre activité',
      price: 0,
      currency: 'CHF',
      isActive: true,
      
      // Limites
      maxInvoicesPerMonth: 10,
      maxClientsTotal: 5,
      maxProductsTotal: 10,
      storageLimit: 100, // MB
      
      // Modules de base
      hasInvoices: true,
      hasQuotes: false,
      hasExpenses: false,
      
      // Fonctionnalités avancées
      hasAIAssistant: false,
      hasAdvancedReports: false,
      hasApiAccess: false,
      hasCustomBranding: false,
      
      // Multi-features (à venir)
      hasMultiUser: false,
      maxUsers: 1,
      hasMultiCompany: false,
      maxCompanies: 1,
      
      // Support
      hasEmailSupport: false,
      hasPrioritySupport: false,
      
      // Fonctionnalités suisses
      hasSwissQRBill: true,
      hasMultiCurrency: false,
      hasMultiLanguage: false,
    },
  });

  // Plan Basic / Starter
  const basicPlan = await prisma.plan.upsert({
    where: { name: 'basic' },
    update: {},
    create: {
      name: 'basic',
      displayName: 'Plan Basique',
      description: 'Idéal pour les petites entreprises',
      price: 29,
      currency: 'CHF',
      isActive: true,
      
      // Limites
      maxInvoicesPerMonth: 50,
      maxClientsTotal: 50,
      maxProductsTotal: 50,
      storageLimit: 500, // MB
      
      // Modules de base
      hasInvoices: true,
      hasQuotes: true,
      hasExpenses: true,
      
      // Fonctionnalités avancées
      hasAIAssistant: false,
      hasAdvancedReports: false,
      hasApiAccess: false,
      hasCustomBranding: false,
      
      // Multi-features (à venir)
      hasMultiUser: false,
      maxUsers: 1,
      hasMultiCompany: false,
      maxCompanies: 1,
      
      // Support
      hasEmailSupport: true,
      hasPrioritySupport: false,
      
      // Fonctionnalités suisses
      hasSwissQRBill: true,
      hasMultiCurrency: true,
      hasMultiLanguage: true,
    },
  });

  // Plan Professional / Premium
  const professionalPlan = await prisma.plan.upsert({
    where: { name: 'professional' },
    update: {},
    create: {
      name: 'professional',
      displayName: 'Plan Professionnel',
      description: 'Pour les entreprises en croissance',
      price: 79,
      currency: 'CHF',
      isActive: true,
      
      // Limites
      maxInvoicesPerMonth: 200,
      maxClientsTotal: 200,
      maxProductsTotal: 200,
      storageLimit: 2000, // MB (2GB)
      
      // Modules de base
      hasInvoices: true,
      hasQuotes: true,
      hasExpenses: true,
      
      // Fonctionnalités avancées
      hasAIAssistant: true,
      hasAdvancedReports: true,
      hasApiAccess: false,
      hasCustomBranding: true,
      
      // Multi-features (à venir)
      hasMultiUser: true,
      maxUsers: 3,
      hasMultiCompany: false,
      maxCompanies: 1,
      
      // Support
      hasEmailSupport: true,
      hasPrioritySupport: true,
      
      // Fonctionnalités suisses
      hasSwissQRBill: true,
      hasMultiCurrency: true,
      hasMultiLanguage: true,
    },
  });

  // Plan Enterprise (Illimité)
  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'enterprise' },
    update: {},
    create: {
      name: 'enterprise',
      displayName: 'Plan Entreprise',
      description: 'Solution complète pour grandes entreprises',
      price: 199,
      currency: 'CHF',
      isActive: true,
      
      // Limites (illimité = -1)
      maxInvoicesPerMonth: -1,
      maxClientsTotal: -1,
      maxProductsTotal: -1,
      storageLimit: -1,
      
      // Modules de base
      hasInvoices: true,
      hasQuotes: true,
      hasExpenses: true,
      
      // Fonctionnalités avancées
      hasAIAssistant: true,
      hasAdvancedReports: true,
      hasApiAccess: true,
      hasCustomBranding: true,
      
      // Multi-features (à venir)
      hasMultiUser: true,
      maxUsers: -1,
      hasMultiCompany: true,
      maxCompanies: -1,
      
      // Support
      hasEmailSupport: true,
      hasPrioritySupport: true,
      
      // Fonctionnalités suisses
      hasSwissQRBill: true,
      hasMultiCurrency: true,
      hasMultiLanguage: true,
    },
  });

  console.log('✅ Plans créés avec succès:');
  console.log('  - Free:', freePlan.id);
  console.log('  - Basic:', basicPlan.id);
  console.log('  - Professional:', professionalPlan.id);
  console.log('  - Enterprise:', enterprisePlan.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
