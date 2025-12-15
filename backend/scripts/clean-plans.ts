import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Limpiando planes...');

  // Eliminar todos los planes
  const deleted = await prisma.plan.deleteMany({});
  
  console.log(`✅ ${deleted.count} planes eliminados`);
  console.log('Ahora puedes crear planes desde /admin/plans');
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
