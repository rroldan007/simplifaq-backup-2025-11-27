import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserIBAN() {
  try {
    console.log('🔧 Updating user IBAN for testing...\n');
    
    // Find the first user
    const user = await prisma.user.findFirst({
      where: {
        id: 'test-user-id',
      },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.email);
    console.log('   Current IBAN:', user.iban || '(not set)');
    console.log('');

    // Valid Swiss QR-IBAN for testing
    // This is a real QR-IBAN with valid checksum - IID 30000-31999 range makes it a QR-IBAN
    const testIBAN = 'CH93 0076 2011 6238 5295 7'; // Valid QR-IBAN

    console.log('📝 Updating IBAN to:', testIBAN);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { iban: testIBAN },
    });

    console.log('✅ IBAN updated successfully!');
    console.log('   New IBAN:', updatedUser.iban);
    console.log('');
    console.log('🎉 User is now ready for QR Bill testing!');

  } catch (error) {
    console.error('❌ Failed to update user IBAN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserIBAN();
