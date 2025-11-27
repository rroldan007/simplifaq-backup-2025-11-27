import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetting admin password...');

    // Find admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: 'admin@simplifaq.ch' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive
    });

    // Hash the new password
    const newPassword = 'AdminSimpliFaq2024!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update admin password
    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin password updated successfully');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Password:', newPassword);

    // Test the password hash
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🧪 Password hash test:', isValid ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetAdminPassword()
  .then(() => {
    console.log('🎉 Admin password reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Admin password reset failed:', error);
    process.exit(1);
  });
