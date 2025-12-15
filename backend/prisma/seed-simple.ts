import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('DemoUser2024!', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@chocolaterie-suisse.ch' },
    update: {},
    create: {
      email: 'demo@chocolaterie-suisse.ch',
      password: hashedPassword,
      companyName: 'Chocolaterie Suisse SA',
      firstName: 'Demo',
      lastName: 'User',
      street: 'Rue du Chocolat 123',
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
      subscriptionPlan: 'free',
      isActive: true,
      emailConfirmed: true,
      emailConfirmedAt: new Date(),
    }
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create demo client
  const client1 = await prisma.client.create({
    data: {
      userId: demoUser.id,
      companyName: 'Restaurant Le Gourmet',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@legourmet.ch',
      phone: '+41 22 345 67 89',
      street: 'Rue du Rhône 25',
      city: 'Genève',
      postalCode: '1204',
      country: 'Switzerland',
    }
  });

  console.log('✅ Client created:', client1.companyName);

  // Create demo products
  await prisma.product.create({
    data: {
      userId: demoUser.id,
      name: 'Chocolat Noir 70%',
      description: 'Tablette de chocolat noir premium',
      unitPrice: 8.50,
      unit: 'pièce',
      tvaRate: 2.5,
      isActive: true,
    }
  });

  await prisma.product.create({
    data: {
      userId: demoUser.id,
      name: 'Chocolat au Lait',
      description: 'Tablette de chocolat au lait suisse',
      unitPrice: 7.50,
      unit: 'pièce',
      tvaRate: 2.5,
      isActive: true,
    }
  });

  await prisma.product.create({
    data: {
      userId: demoUser.id,
      name: 'Truffes Assorties',
      description: 'Boîte de 12 truffes artisanales',
      unitPrice: 25.00,
      unit: 'boîte',
      tvaRate: 2.5,
      isActive: true,
    }
  });

  console.log('✅ 3 products created');

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
