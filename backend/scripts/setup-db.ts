/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SWISS_TVA_RATES } from '../src/types';

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Simplifaq database...');

    // Create demo users
    const demoPassword = 'DemoUser2024!';
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    
    // Main demo user
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@chocolaterie-suisse.ch' },
      update: {},
      create: {
        email: 'demo@chocolaterie-suisse.ch',
        password: hashedPassword,
        companyName: 'Chocolaterie Suisse SA',
        firstName: 'Jean',
        lastName: 'Dupont',
        vatNumber: 'CHE-123.456.789',
        phone: '+41 21 123 45 67',
        website: 'https://simplifaq.ch',
        language: 'fr',
        currency: 'CHF',
        street: 'Rue de la Paix 123',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'Switzerland',
        canton: 'VD',
        iban: 'CH93 0076 2011 6238 5295 7',
        subscriptionPlan: 'basic',
      },
    });

    console.log('✅ Demo user created:', demoUser.email);

    // Create demo clients
    const demoClient1 = await prisma.client.upsert({
      where: { id: 'demo-client-1' },
      update: {},
      create: {
        id: 'demo-client-1',
        userId: demoUser.id,
        companyName: 'Entreprise ABC Sàrl',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@abc-sarl.ch',
        phone: '+41 22 987 65 43',
        vatNumber: 'CHE-987.654.321',
        language: 'fr',
        paymentTerms: 30,
        street: 'Avenue des Alpes 456',
        city: 'Genève',
        postalCode: '1200',
        country: 'Switzerland',
        canton: 'GE',
        notes: 'Client important - conditions de paiement préférentielles',
      },
    });

    const demoClient2 = await prisma.client.upsert({
      where: { id: 'demo-client-2' },
      update: {},
      create: {
        id: 'demo-client-2',
        userId: demoUser.id,
        companyName: 'Tech Solutions GmbH',
        firstName: 'Hans',
        lastName: 'Müller',
        email: 'h.mueller@techsolutions.ch',
        phone: '+41 44 555 12 34',
        language: 'de',
        paymentTerms: 15,
        street: 'Bahnhofstrasse 789',
        city: 'Zürich',
        postalCode: '8001',
        country: 'Switzerland',
        canton: 'ZH',
      },
    });

    console.log('✅ Demo clients created');

    // Create demo products/services
    const products = [
      {
        id: 'demo-product-1',
        name: 'Consultation IT',
        description: 'Consultation en informatique par heure',
        unitPrice: 120.00,
        tvaRate: SWISS_TVA_RATES.STANDARD,
        unit: 'heure',
      },
      {
        id: 'demo-product-2',
        name: 'Développement Web',
        description: 'Développement de site web',
        unitPrice: 95.00,
        tvaRate: SWISS_TVA_RATES.STANDARD,
        unit: 'heure',
      },
      {
        id: 'demo-product-3',
        name: 'Formation',
        description: 'Formation en informatique',
        unitPrice: 80.00,
        tvaRate: SWISS_TVA_RATES.REDUCED,
        unit: 'heure',
      },
      {
        id: 'demo-product-4',
        name: 'Maintenance',
        description: 'Maintenance système mensuelle',
        unitPrice: 250.00,
        tvaRate: SWISS_TVA_RATES.STANDARD,
        unit: 'mois',
      },
    ];

    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {},
        create: {
          ...product,
          userId: demoUser.id,
        },
      });
    }

    console.log('✅ Demo products created');
    // Seed Swiss expense accounts (for demo user)
    const defaultAccounts = [
      { code: '5200', name: 'Salaires' },
      { code: '6000', name: 'Loyer' },
      { code: '6200', name: 'Entretien des véhicules' },
      { code: '6300', name: 'Assurance' },
      { code: '6500', name: "Frais d'administration" },
      { code: '6510', name: 'Téléphone / Fax / Internet' },
      { code: '6700', name: "Autres charges d'exploitation" },
      { code: '6900', name: 'Intérêts — charges' },
      { code: '6940', name: 'Frais bancaires' },
    ];
    for (const acc of defaultAccounts) {
      await prisma.account.upsert({
        where: { userId_code: { userId: demoUser.id, code: acc.code } },
        update: {},
        create: { userId: demoUser.id, code: acc.code, name: acc.name, type: 'EXPENSE', active: true },
      });
    }
    console.log('✅ Default Swiss expense accounts seeded');

    // Create a demo invoice
    const demoInvoice = await prisma.invoice.create({
      data: {
        userId: demoUser.id,
        clientId: demoClient1.id,
        invoiceNumber: 'FAC-2024-001',
        status: 'sent',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        language: 'fr',
        currency: 'CHF',
        subtotal: 0, // Will be calculated
        tvaAmount: 0, // Will be calculated
        total: 0, // Will be calculated
        qrReferenceType: 'NON',
        notes: 'Merci pour votre confiance',
        terms: 'Paiement dans les 30 jours',
        items: {
          create: [
            {
              description: 'Consultation IT - Analyse système',
              quantity: 8,
              unitPrice: 120.00,
              tvaRate: SWISS_TVA_RATES.STANDARD,
              total: 960.00,
              order: 1,
            },
            {
              description: 'Développement Web - Page d\'accueil',
              quantity: 12,
              unitPrice: 95.00,
              tvaRate: SWISS_TVA_RATES.STANDARD,
              total: 1140.00,
              order: 2,
            },
          ],
        },
      },
    });

    // Calculate totals
    const subtotal = 960.00 + 1140.00; // 2100.00
    const tvaAmount = subtotal * (SWISS_TVA_RATES.STANDARD / 100); // 170.10
    const total = subtotal + tvaAmount; // 2270.10

    await prisma.invoice.update({
      where: { id: demoInvoice.id },
      data: {
        subtotal,
        tvaAmount,
        total,
      },
    });

    console.log('✅ Demo invoice created');

    console.log('🎉 Database setup completed successfully!');
    console.log(`📧 Demo login: demo@chocolaterie-suisse.ch / ${demoPassword}`);

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });