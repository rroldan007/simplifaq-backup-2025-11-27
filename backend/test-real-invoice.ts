import { PrismaClient } from '@prisma/client';
import { generateInvoicePDF } from './dist/utils/invoicePDFPdfkit';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testRealInvoiceGeneration() {
  try {
    console.log('🧪 Testing Real Invoice PDF Generation with QR Bill\n');
    
    // Get the first invoice from the database
    const invoice = await prisma.invoice.findFirst({
      where: {
        currency: 'CHF', // Only test with CHF invoices
      },
      include: {
        client: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { order: 'asc' },
        },
        user: true,
      },
    });

    if (!invoice) {
      console.log('❌ No CHF invoices found in database');
      return;
    }

    console.log('✅ Found invoice:', invoice.invoiceNumber);
    console.log('   Client:', invoice.client?.companyName || `${invoice.client?.firstName} ${invoice.client?.lastName}`);
    console.log('   Total:', invoice.total, invoice.currency);
    console.log('   User IBAN:', invoice.user?.iban || '(not configured)');
    console.log('');

    // Import the QR Bill creation function
    const { createQRBillFromInvoice } = await import('./dist/controllers/invoiceController');
    
    // Generate QR Bill data
    console.log('📝 Generating QR Bill data...');
    const qrBillData = await createQRBillFromInvoice(invoice as any);
    
    console.log('✅ QR Bill data generated:');
    console.log('   Creditor:', qrBillData.creditor.name);
    console.log('   Creditor Account:', qrBillData.creditorAccount || '(empty)');
    console.log('   Amount:', qrBillData.amount, qrBillData.currency);
    console.log('   Has Debtor:', !!qrBillData.debtor);
    if (qrBillData.debtor) {
      console.log('   Debtor:', qrBillData.debtor.name);
    }
    console.log('');

    // Create output directory
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create output stream
    const outputPath = path.join(outputDir, `invoice-${invoice.invoiceNumber}.pdf`);
    const writeStream = fs.createWriteStream(outputPath);

    // Prepare data for PDF generation
    const pdfData = {
      invoice: invoice as any,
      client: invoice.client as any,
      qrData: qrBillData,
      lang: 'fr' as const,
    };

    console.log('📝 Generating PDF...');
    
    await generateInvoicePDF(pdfData, writeStream);
    
    // Wait for stream to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('✅ PDF generated successfully!');
    console.log('   File:', outputPath);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log('   Size:', stats.size, 'bytes');
    
    if (stats.size > 0) {
      console.log('\n🎉 Test completed successfully!');
    } else {
      console.log('\n❌ Warning: PDF file is empty');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:');
    console.error('  Message:', (error as any)?.message);
    console.error('  Stack:', (error as any)?.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRealInvoiceGeneration();
