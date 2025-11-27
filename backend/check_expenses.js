const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:/var/www/simplifaq/test/backend/prisma/dev.db'
    }
  }
});

async function checkExpenses() {
  try {
    console.log('🔍 Consultando gastos...\n');
    
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
      take: 5
    });

    if (expenses.length === 0) {
      console.log('❌ No se encontraron gastos para este usuario');
    } else {
      console.log(`✅ Se encontraron ${expenses.length} gastos:\n`);
      expenses.forEach(exp => {
        console.log(`📄 ${exp.label}`);
        console.log(`   💰 Monto: ${exp.amount} ${exp.currency}`);
        console.log(`   🏢 Proveedor: ${exp.supplier || 'N/A'}`);
        console.log(`   📊 Cuenta: ${exp.account?.name} (${exp.account?.code})`);
        console.log(`   📅 Fecha: ${exp.date.toISOString().split('T')[0]}`);
        console.log(`   🆔 ID: ${exp.id}`);
        console.log('');
      });
    }

    // Check accounts
    console.log('\n📊 Cuentas disponibles:');
    const accounts = await prisma.account.findMany({
      where: {
        userId: 'cmhyf26e80000iwih7l0qipsb',
        active: true
      },
      orderBy: {
        code: 'asc'
      }
    });

    if (accounts.length === 0) {
      console.log('❌ No hay cuentas activas');
    } else {
      accounts.forEach(acc => {
        console.log(`   ${acc.code} - ${acc.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkExpenses();
