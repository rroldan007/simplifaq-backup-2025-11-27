const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQuotes() {
  const quotes = await prisma.invoice.findMany({
    where: { isQuote: true },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      sentAt: true,
      emailSentAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  console.log('\n=== ÚLTIMOS 10 DEVIS ===\n');
  quotes.forEach(q => {
    console.log(`${q.invoiceNumber}: status="${q.status}", sentAt=${q.sentAt ? 'YES' : 'NO'}, emailSentAt=${q.emailSentAt ? 'YES' : 'NO'}, updated=${q.updatedAt}`);
  });
  
  await prisma.$disconnect();
}

checkQuotes().catch(console.error);
