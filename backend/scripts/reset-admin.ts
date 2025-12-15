import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Reseteando Super Admin...\n');

  const email = 'admin@simplifaq.ch';
  const password = 'Admin123!';

  // Eliminar admin existente si existe
  await prisma.adminUser.deleteMany({
    where: { email },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear super admin
  const admin = await prisma.adminUser.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'SimpliFaq',
      role: 'super_admin',
      permissions: {
        users: { read: true, write: true, delete: true },
        invoices: { read: true, write: true, delete: true },
        subscriptions: { read: true, write: true, delete: true },
        analytics: { read: true },
        settings: { read: true, write: true },
        backups: { read: true, write: true },
        logs: { read: true },
      },
      isActive: true,
      twoFactorEnabled: false,
    },
  });

  console.log('✅ Super Admin creado con succès!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 Email:    ${admin.email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 Nom:      ${admin.firstName} ${admin.lastName}`);
  console.log(`🔑 Rôle:     ${admin.role}`);
  console.log(`🆔 ID:       ${admin.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🌐 Login en: http://localhost:3000/admin/login\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
