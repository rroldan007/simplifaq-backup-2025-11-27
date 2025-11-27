import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: 'admin@simplifaq.ch' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('AdminSimpliFaq2024!', 12);

    // Create admin user
    const adminUser = await prisma.adminUser.create({
      data: {
        email: 'admin@simplifaq.ch',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        permissions: {
          users: ['read', 'write', 'delete'],
          invoices: ['read', 'write', 'delete'],
          reports: ['read', 'write'],
          system: ['read', 'write', 'delete'],
          admin: ['read', 'write', 'delete']
        },
        isActive: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName
    });

    // Also create support admin user
    const supportAdmin = await prisma.adminUser.create({
      data: {
        email: 'support@simplifaq.ch',
        password: await bcrypt.hash('SupportSimpliFaq2024!', 12),
        firstName: 'Support',
        lastName: 'Admin',
        role: 'support_admin',
        permissions: {
          users: ['read', 'write'],
          invoices: ['read'],
          reports: ['read'],
          system: ['read'],
          admin: ['read']
        },
        isActive: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Support admin user created successfully:', {
      id: supportAdmin.id,
      email: supportAdmin.email,
      role: supportAdmin.role
    });

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('🎉 Admin user creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Admin user creation failed:', error);
    process.exit(1);
  });
