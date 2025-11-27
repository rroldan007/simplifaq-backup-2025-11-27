const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { isQuote: false },
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

  console.log('\n=== ÚLTIMAS 10 FACTURAS ===\n');
  invoices.forEach(inv => {
    console.log(`${inv.invoiceNumber}: status="${inv.status}", sentAt=${inv.sentAt ? 'YES' : 'NO'}, emailSentAt=${inv.emailSentAt ? 'YES' : 'NO'}`);
  });
  
  await prisma.$disconnect();
}

checkInvoices().catch(console.error);
