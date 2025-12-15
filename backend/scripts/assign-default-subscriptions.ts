import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuarios sin suscripción...');

  // Obtener plan gratuito
  const freePlan = await prisma.plan.findUnique({
    where: { name: 'free' },
  });

  if (!freePlan) {
    console.error('❌ Plan gratuit no encontrado. Ejecuta seed-plans.ts primero.');
    process.exit(1);
  }

  // Obtener usuarios sin suscripción
  const usersWithoutSub = await prisma.user.findMany({
    where: {
      subscription: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (usersWithoutSub.length === 0) {
    console.log('✅ Todos los usuarios ya tienen una suscripción');
    return;
  }

  console.log(`📋 ${usersWithoutSub.length} usuarios sin suscripción encontrados`);

  // Crear suscripción gratuita para cada usuario
  for (const user of usersWithoutSub) {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        storageUsed: 0,
      },
    });

    console.log(`  ✅ Suscripción creada para: ${user.email} (${user.firstName} ${user.lastName})`);
  }

  console.log(`\n✅ ${usersWithoutSub.length} suscripciones creadas exitosamente`);
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
