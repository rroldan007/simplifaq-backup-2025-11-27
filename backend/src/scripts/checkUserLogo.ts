import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUserLogo(email: string) {
  if (!email) {
    throw new Error('Please provide an email address.');
  }

  console.log(`Searching for user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
    select: {
      id: true,
      email: true,
      logoUrl: true,
      companyName: true,
    },
  });

  if (!user) {
    console.log(`User with email ${email} not found.`);
  } else {
    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));
  }
}

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please pass the user email as an argument.');
  console.error('Usage: ts-node src/scripts/checkUserLogo.ts <email>');
  process.exit(1);
}

findUserLogo(userEmail)
  .catch((e) => {
    console.error('An error occurred:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
