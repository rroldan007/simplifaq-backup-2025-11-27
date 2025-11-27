const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  // Get a draft quote
  const quote = await prisma.invoice.findFirst({
    where: { 
      isQuote: true,
      status: 'DRAFT'
    },
  });

  if (!quote) {
    console.log('No DRAFT quotes found');
    return;
  }

  console.log('\n=== BEFORE UPDATE ===');
  console.log(`Quote: ${quote.invoiceNumber}`);
  console.log(`Status: "${quote.status}"`);
  console.log(`Status toLowerCase: "${quote.status.toLowerCase()}"`);
  console.log(`Comparison: status.toLowerCase() === 'draft' = ${quote.status.toLowerCase() === 'draft'}`);

  // Simulate the update
  const newStatus = quote.status.toLowerCase() === 'draft' ? 'SENT' : quote.status;
  console.log(`\nNew status would be: "${newStatus}"`);

  // Actually update it
  const updated = await prisma.invoice.update({
    where: { id: quote.id },
    data: {
      status: newStatus,
      sentAt: new Date(),
      emailSentAt: new Date(),
    },
  });

  console.log('\n=== AFTER UPDATE ===');
  console.log(`Status: "${updated.status}"`);
  console.log(`SentAt: ${updated.sentAt}`);
  
  await prisma.$disconnect();
}

testUpdate().catch(console.error);
