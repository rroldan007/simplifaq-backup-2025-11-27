const PDFDocument = require('pdfkit');
const { SwissQRBill } = require('swissqrbill/pdf');
const fs = require('fs');
const path = require('path');

// Test data matching the format in invoicePDFPdfkit.ts
const testQRBillData = {
  creditor: {
    name: 'Test Company SA',
    address: 'Test Street 123',
    zip: '8000',
    city: 'Zurich',
    country: 'CH',
    account: 'CH9300762011623852957'
  },
  debtor: {
    name: 'Test Client SA',
    address: 'Client Street 456',
    zip: '8001',
    city: 'Zurich',
    country: 'CH'
  },
  amount: 100.00,
  currency: 'CHF',
  reference: undefined,
  referenceType: 'NON',
  unstructuredMessage: 'Test invoice'
};

console.log('🧪 Testing SwissQRBill PDF generation...\n');
console.log('📋 Test data:', JSON.stringify(testQRBillData, null, 2));

try {
  // Create PDF document
  const doc = new PDFDocument({ 
    margin: 0, 
    size: 'A4', 
    bufferPages: true, 
    autoFirstPage: true 
  });
  
  // Create write stream
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'test-qr-bill.pdf');
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);
  
  // Add some content first
  doc.font('Helvetica').fontSize(20).text('Test Invoice', 50, 50);
  
  console.log('\n📝 Attempting to create SwissQRBill instance...');
  
  // Try to create QR Bill (this is where the error might occur)
  const qrBill = new SwissQRBill(testQRBillData, { language: 'FR' });
  
  console.log('✅ SwissQRBill instance created successfully');
  console.log('\n📝 Attempting to attach QR Bill to PDF...');
  
  // Position QR Bill at bottom of page
  const qrHeight = 105; // mm
  const qrBillBottomMargin = 10; // mm
  const qrBillY = doc.page.height - (qrHeight * 2.83465) - (qrBillBottomMargin * 2.83465);
  
  doc.fillColor('#000000').strokeColor('#000000');
  qrBill.attachTo(doc);
  
  console.log('✅ QR Bill attached to PDF successfully');
  
  // Finalize PDF
  doc.end();
  
  writeStream.on('finish', () => {
    console.log(`\n✅ PDF saved to: ${outputPath}`);
    console.log('🎉 Test completed successfully!');
  });
  
  writeStream.on('error', (error) => {
    console.error('❌ Error writing PDF:', error);
  });
  
} catch (error) {
  console.error('\n❌ Error during test:', error);
  console.error('\nError details:');
  console.error('  Message:', error.message);
  console.error('  Stack:', error.stack);
  process.exit(1);
}
