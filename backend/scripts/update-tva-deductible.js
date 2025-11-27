const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTvaDeductible() {
  try {
    console.log('🔄 Updating TVA déductible for existing expenses...');
    
    // Get all expenses with tvaRate
    const expenses = await prisma.expense.findMany({
      where: {
        tvaRate: { not: null }
      }
    });
    
    console.log(`Found ${expenses.length} expenses with TVA rate`);
    
    let updated = 0;
    for (const expense of expenses) {
      if (expense.tvaRate && expense.tvaRate > 0) {
        const tvaDeductible = expense.amount * (expense.tvaRate / (100 + expense.tvaRate));
        
        await prisma.expense.update({
          where: { id: expense.id },
          data: { tvaDeductible }
        });
        
        console.log(`✓ Updated expense ${expense.id}: ${expense.label} - TVA: ${tvaDeductible.toFixed(2)}`);
        updated++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${updated} expenses`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTvaDeductible();
