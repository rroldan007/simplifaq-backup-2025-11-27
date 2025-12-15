import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🔐 Création d\'un Super Admin\n');

  const email = await prompt('Email: ');
  const password = await prompt('Mot de passe (min 8 caractères): ');
  const firstName = await prompt('Prénom: ');
  const lastName = await prompt('Nom: ');

  if (password.length < 8) {
    console.error('❌ Le mot de passe doit contenir au moins 8 caractères');
    rl.close();
    return;
  }

  // Check if admin already exists
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('\n⚠️  Un admin avec cet email existe déjà');
    const overwrite = await prompt('Voulez-vous le remplacer? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Opération annulée');
      rl.close();
      return;
    }
    await prisma.adminUser.delete({ where: { email } });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create super admin
  const admin = await prisma.adminUser.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
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

  console.log('\n✅ Super Admin créé avec succès!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 Email:    ${admin.email}`);
  console.log(`👤 Nom:      ${admin.firstName} ${admin.lastName}`);
  console.log(`🔑 Rôle:     ${admin.role}`);
  console.log(`🆔 ID:       ${admin.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🌐 Vous pouvez maintenant vous connecter sur:');
  console.log('   http://localhost:3000/admin/login\n');

  rl.close();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur:', e);
    await prisma.$disconnect();
    rl.close();
    process.exit(1);
  });
