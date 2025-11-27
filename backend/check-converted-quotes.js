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
      convertedInvoiceId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });

  console.log('\n=== ÚLTIMOS 10 DEVIS (incluyendo convertidos) ===\n');
  quotes.forEach(q => {
    const converted = q.convertedInvoiceId ? 'CONVERTIDO' : 'NO';
    console.log(`${q.invoiceNumber}: status="${q.status}", converted=${converted}, convertedId=${q.convertedInvoiceId || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

checkQuotes().catch(console.error);
