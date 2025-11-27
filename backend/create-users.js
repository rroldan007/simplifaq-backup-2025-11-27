const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUsers() {
  console.log('🇨🇭 Creating SimpliFaq Demo Users...');

  try {
    // Create admin users
    console.log('🔧 Creating SaaS Admin Users...');
    
    const adminUsers = [
      {
        email: 'admin@simplifaq.ch',
        password: 'AdminSimpliFaq2024!',
        firstName: 'Super',
        lastName: 'Administrateur',
        role: 'super_admin',
        permissions: {
          users: ['read', 'write', 'delete'],
          subscriptions: ['read', 'write', 'delete'],
          plans: ['read', 'write', 'delete'],
          system: ['read', 'write', 'delete'],
          support: ['read', 'write', 'delete'],
          analytics: ['read'],
          billing: ['read', 'write', 'delete'],
        },
      },
      {
        email: 'support@simplifaq.ch',
        password: 'SupportSimpliFaq2024!',
        firstName: 'Agent',
        lastName: 'Support',
        role: 'support_admin',
        permissions: {
          users: ['read', 'write'],
          subscriptions: ['read'],
          support: ['read', 'write', 'delete'],
          analytics: ['read'],
        },
      },
      {
        email: 'billing@simplifaq.ch',
        password: 'BillingSimpliFaq2024!',
        firstName: 'Gestionnaire',
        lastName: 'Facturation',
        role: 'billing_admin',
        permissions: {
          users: ['read'],
          subscriptions: ['read', 'write'],
          billing: ['read', 'write', 'delete'],
          analytics: ['read'],
        },
      },
    ];

    for (const userData of adminUsers) {
      try {
        const existingAdmin = await prisma.adminUser.findUnique({
          where: { email: userData.email },
        });

        if (existingAdmin) {
          console.log(`⚠️  Admin user ${userData.email} already exists, skipping...`);
          continue;
        }

        const hashedPassword = await bcrypt.hash(userData.password, 12);

        const adminUser = await prisma.adminUser.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            permissions: userData.permissions,
            isActive: true,
          },
        });

        console.log(`✅ Admin user created: ${adminUser.email} (${adminUser.role})`);
      } catch (error) {
        console.log(`❌ Failed to create admin user ${userData.email}: ${error.message}`);
      }
    }

    // Ensure plans exist
    console.log('📋 Ensuring plans exist...');
    const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
    
    if (!freePlan) {
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
          storageLimit: 50,
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
          storageLimit: 500,
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
          storageLimit: 2000,
          hasSwissQRBill: true,
          hasMultiCurrency: true,
          hasMultiLanguage: true,
        },
      ];

      for (const planData of plans) {
        await prisma.plan.create({ data: planData });
        console.log(`✅ Plan created: ${planData.displayName}`);
      }
    }

    // Create regular users
    console.log('👥 Creating Regular App Users...');
    
    const regularUsers = [
      {
        email: 'demo@chocolaterie-suisse.ch',
        password: 'DemoUser2024!',
        firstName: 'Marie',
        lastName: 'Dubois',
        companyName: 'Chocolaterie Suisse SA',
      },
      {
        email: 'contact@consulting-geneve.ch',
        password: 'ConsultDemo2024!',
        firstName: 'Pierre',
        lastName: 'Martin',
        companyName: 'Consulting Genève Sàrl',
      },
      {
        email: 'info@tech-lausanne.ch',
        password: 'TechDemo2024!',
        firstName: 'Sophie',
        lastName: 'Müller',
        companyName: 'Tech Solutions Lausanne SA',
      },
    ];

    for (const userData of regularUsers) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          console.log(`⚠️  Regular user ${userData.email} already exists, skipping...`);
          continue;
        }

        const hashedPassword = await bcrypt.hash(userData.password, 12);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyName: userData.companyName,
            vatNumber: `CHE-${Math.floor(Math.random() * 900000) + 100000}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100} TVA`,
            phone: `+41 ${Math.random() > 0.5 ? '21' : '22'} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
            website: `https://www.${userData.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.ch`,
            language: 'fr',
            currency: 'CHF',
            subscriptionPlan: 'free',
            street: 'Rue de la Paix 12',
            city: 'Genève',
            postalCode: '1202',
            country: 'Switzerland',
            canton: 'GE',
            iban: `CH93 0076 2011 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9)}`,
            isActive: true,
          },
        });

        // Create subscription
        const plan = await prisma.plan.findUnique({ where: { name: 'free' } });
        if (plan) {
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: plan.id,
              status: 'active',
              currentPeriodStart,
              currentPeriodEnd,
              billingEmail: user.email,
            },
          });
        }

        console.log(`✅ Regular user created: ${user.email} (${user.companyName})`);
      } catch (error) {
        console.log(`❌ Failed to create regular user ${userData.email}: ${error.message}`);
      }
    }

    console.log('🎉 All demo users created successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();