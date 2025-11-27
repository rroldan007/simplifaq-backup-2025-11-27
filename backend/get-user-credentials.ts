import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUserCredentials() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        companyName: true,
        iban: true,
      },
      take: 5,
    });

    console.log('👥 Usuarios en la base de datos:\n');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Company: ${user.companyName}`);
      console.log(`   IBAN: ${user.iban || '(not set)'}`);
      console.log('');
    });

    console.log('💡 Para probar QR Bill, el usuario debe tener un IBAN configurado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getUserCredentials();
