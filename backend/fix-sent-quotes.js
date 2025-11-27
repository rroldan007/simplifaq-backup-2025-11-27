const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSentQuotes() {
  // Find quotes with sentAt but still DRAFT status
  const quotesToFix = await prisma.invoice.findMany({
    where: { 
      isQuote: true,
      status: 'DRAFT',
      sentAt: { not: null }
    },
  });

  console.log(`\n=== Found ${quotesToFix.length} quotes to fix ===\n`);

  for (const quote of quotesToFix) {
    console.log(`Updating ${quote.invoiceNumber} from DRAFT to SENT...`);
    await prisma.invoice.update({
      where: { id: quote.id },
      data: { status: 'SENT' },
    });
  }

  console.log('\n✅ All sent quotes updated!\n');
  
  await prisma.$disconnect();
}

fixSentQuotes().catch(console.error);
