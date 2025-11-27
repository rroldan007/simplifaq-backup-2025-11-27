#!/usr/bin/env node

/**
 * Create Demo User Script
 * 
 * Quick script to create/restore the demo user
 * Usage: node scripts/create-demo-user.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDemoUser() {
  console.log('🔧 Creating demo user...\n');

  const hashedPassword = await bcrypt.hash('DemoUser2024!', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@chocolaterie-suisse.ch' },
    update: {
      password: hashedPassword,
      isActive: true,
    },
    create: {
      email: 'demo@chocolaterie-suisse.ch',
      password: hashedPassword,
      companyName: 'Chocolaterie SARL',
      firstName: 'Demo',
      lastName: 'User',
      street: 'Rue de la Chocolaterie 1',
      city: 'Genève',
      postalCode: '1200',
      country: 'Switzerland',
      canton: 'GE',
      vatNumber: 'CHE-123.456.789',
      phone: '+41 22 123 45 67',
      iban: 'CH93 0076 2011 6238 5295 7',
      website: 'https://chocolaterie-suisse.ch',
      language: 'fr',
      currency: 'CHF',
      subscriptionPlan: 'premium',
      isActive: true,
      invoicePrefix: 'FAC',
      nextInvoiceNumber: 1,
      invoicePadding: 3,
      quotePrefix: 'DEV',
      nextQuoteNumber: 1,
      quotePadding: 3,
    }
  });
  
  console.log('✅ Usuario demo creado/actualizado\n');
  console.log('📧 Credenciales de login:');
  console.log('   Email:    demo@chocolaterie-suisse.ch');
  console.log('   Password: DemoUser2024!\n');
  console.log('🏢 Empresa:  Chocolaterie SARL');
  console.log('👤 Nombre:   Demo User\n');
}

createDemoUser()
  .then(() => {
    console.log('🎉 ¡Listo!\n');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
