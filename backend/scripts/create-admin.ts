import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:Privad0_07@localhost:5432/simplifaq_dev'
    }
  }
});

async function createAdminUser() {
  try {
    const email = 'admin@simplifaq.ch';
    const password = 'Admin123!';
    
    // Verificar si ya existe un administrador con este correo
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      console.log(`Admin user with email ${email} already exists.`);
      return;
    }

    // Crear el usuario administrador
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminUser = await prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        permissions: {
          canManageUsers: true,
          canManageSettings: true,
          canViewAnalytics: true,
          canManageContent: true,
          isSuperAdmin: true
        },
        isActive: true
      }
    });

    console.log('✅ Admin user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('Role: super_admin');
    console.log('\n¡Importante! Guarda estas credenciales en un lugar seguro.');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
