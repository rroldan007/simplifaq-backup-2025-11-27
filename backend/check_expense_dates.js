const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:/var/www/simplifaq/test/backend/prisma/dev.db'
    }
  }
});

async function checkDates() {
  try {
    console.log('🔍 Verificando fechas de los gastos...\n');
    
    const expenses = await prisma.expense.findMany({
      where: {
        userId: 'cmhyf26e80000iwih7l0qipsb'
      },
      include: {
        account: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Total gastos: ${expenses.length}\n`);
    
    expenses.forEach(exp => {
      console.log(`📄 ${exp.label}`);
      console.log(`   💰 ${exp.amount} ${exp.currency}`);
      console.log(`   📅 date field: ${exp.date}`);
      console.log(`   📅 date ISO: ${exp.date.toISOString()}`);
      console.log(`   🕐 createdAt: ${exp.createdAt.toISOString()}`);
      console.log(`   📊 Cuenta: ${exp.account?.name} (${exp.account?.code})`);
      console.log('');
    });

    // Check what the frontend filter would see
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    console.log('\n🔍 Filtro del frontend:');
    console.log(`   Desde: ${firstDayOfMonth.toISOString()}`);
    console.log(`   Hasta: ${now.toISOString()}`);
    console.log('');

    const filtered = await prisma.expense.findMany({
      where: {
        userId: 'cmhyf26e80000iwih7l0qipsb',
        date: {
          gte: firstDayOfMonth,
          lte: now
        }
      },
      include: {
        account: true
      },
      orderBy: { date: 'desc' }
    });

    console.log(`✅ Gastos en el rango (${filtered.length}):`);
    filtered.forEach(exp => {
      console.log(`   - ${exp.label}: ${exp.date.toISOString().split('T')[0]}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
