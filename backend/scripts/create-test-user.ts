import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const email = 'test@simplifaq.ch';
  const password = await bcrypt.hash('Test123456!', 12);
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Test user already exists:', email);
    console.log('User ID:', existing.id);
    return;
  }
  
  const user = await prisma.user.create({
    data: {
      email,
      password,
      companyName: 'Test Company SA',
      firstName: 'Test',
      lastName: 'User',
      street: 'Rue du Test 1',
      city: 'Genève',
      postalCode: '1200',
      country: 'Switzerland',
      canton: 'GE',
      isActive: true,
      emailConfirmed: true,
      subscriptionPlan: 'pro',
    }
  });
  
  console.log('Test user created successfully!');
  console.log('Email:', user.email);
  console.log('Password: Test123456!');
  console.log('User ID:', user.id);
}

createTestUser()
  .then(() => prisma.$disconnect())
  .catch(e => { 
    console.error('Error:', e); 
    prisma.$disconnect(); 
  });
