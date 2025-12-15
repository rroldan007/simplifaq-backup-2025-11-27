import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create demo user
  const hashedPassword = await bcrypt.hash('DemoUser2024!', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@chocolaterie-suisse.ch' },
    update: {},
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
      pdfPrimaryColor: '#4F46E5',
      pdfTemplate: 'swiss_classic',
      pdfShowVAT: true,
      pdfShowPhone: true,
      pdfShowEmail: true,
      pdfShowWebsite: true,
      pdfShowIBAN: false,
      pdfShowCompanyNameWithLogo: true,
    }
  });

  console.log('✅ Demo user created:', demoUser.email);

  // 2. Create demo clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { 
        userId_companyName: {
          userId: demoUser.id,
          companyName: 'Restaurant Le Gourmet'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        companyName: 'Restaurant Le Gourmet',
        contactFirstName: 'Jean',
        contactLastName: 'Dupont',
        email: 'jean.dupont@legourmet.ch',
        phone: '+41 22 345 67 89',
        street: 'Rue du Rhône 25',
        city: 'Genève',
        postalCode: '1204',
        country: 'Switzerland',
        isCompany: true,
      }
    }),
    prisma.client.upsert({
      where: { 
        userId_companyName: {
          userId: demoUser.id,
          companyName: 'Café Bleu'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        companyName: 'Café Bleu',
        contactFirstName: 'Marie',
        contactLastName: 'Martin',
        email: 'marie@cafebleu.ch',
        phone: '+41 22 456 78 90',
        street: 'Place du Molard 3',
        city: 'Genève',
        postalCode: '1204',
        country: 'Switzerland',
        isCompany: true,
      }
    }),
    prisma.client.upsert({
      where: { 
        userId_companyName: {
          userId: demoUser.id,
          companyName: 'Pâtisserie Sophie'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        companyName: 'Pâtisserie Sophie',
        contactFirstName: 'Sophie',
        contactLastName: 'Rousseau',
        email: 'sophie@patisserie-sophie.ch',
        phone: '+41 22 567 89 01',
        street: 'Rue de Carouge 45',
        city: 'Genève',
        postalCode: '1205',
        country: 'Switzerland',
        isCompany: true,
      }
    })
  ]);

  console.log(`✅ ${clients.length} demo clients created`);

  // 3. Create demo products
  const products = await Promise.all([
    prisma.product.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: 'Chocolat Noir 70%'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        name: 'Chocolat Noir 70%',
        description: 'Tablette de chocolat noir premium',
        unitPrice: 8.50,
        currency: 'CHF',
        unit: 'pièce',
        taxRate: 2.5,
        isActive: true,
      }
    }),
    prisma.product.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: 'Chocolat au Lait'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        name: 'Chocolat au Lait',
        description: 'Tablette de chocolat au lait suisse',
        unitPrice: 7.50,
        currency: 'CHF',
        unit: 'pièce',
        taxRate: 2.5,
        isActive: true,
      }
    }),
    prisma.product.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: 'Truffes Assorties'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        name: 'Truffes Assorties',
        description: 'Boîte de 12 truffes artisanales',
        unitPrice: 25.00,
        currency: 'CHF',
        unit: 'boîte',
        taxRate: 2.5,
        isActive: true,
      }
    }),
    prisma.product.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: 'Pralines Maison'
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        name: 'Pralines Maison',
        description: 'Assortiment de pralines faites main',
        unitPrice: 32.00,
        unit: 'boîte',
        tvaRate: 2.5,
        isActive: true,
      }
    })
  ]);

  console.log(`✅ ${products.length} demo products created`);

  // 4. Create default expense accounts
  const expenseAccounts = [
    { code: '5200', name: 'Salaires', type: 'EXPENSE' },
    { code: '6000', name: 'Loyer et charges', type: 'EXPENSE' },
    { code: '6200', name: 'Entretien des véhicules', type: 'EXPENSE' },
    { code: '6300', name: 'Assurances', type: 'EXPENSE' },
    { code: '6500', name: 'Frais d\'administration', type: 'EXPENSE' },
    { code: '6510', name: 'Téléphone / Internet', type: 'EXPENSE' },
    { code: '6600', name: 'Publicité et marketing', type: 'EXPENSE' },
    { code: '6700', name: 'Autres charges d\'exploitation', type: 'EXPENSE' },
    { code: '6900', name: 'Intérêts et charges financières', type: 'EXPENSE' },
    { code: '6940', name: 'Frais bancaires', type: 'EXPENSE' },
  ];

  for (const acc of expenseAccounts) {
    await prisma.account.upsert({
      where: {
        userId_code: {
          userId: demoUser.id,
          code: acc.code
        }
      },
      update: {},
      create: {
        userId: demoUser.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        active: true,
      }
    });
  }

  console.log(`✅ ${expenseAccounts.length} expense accounts created`);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📧 Login credentials:');
  console.log('   Email: demo@chocolaterie-suisse.ch');
  console.log('   Password: DemoUser2024!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
