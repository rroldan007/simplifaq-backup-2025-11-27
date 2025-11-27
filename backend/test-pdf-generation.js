const { generateInvoicePDFWithQRBill } = require('./dist/utils/invoicePDF');
const { QRReferenceType } = require('./dist/utils/swissQRBill');
const fs = require('fs');
const path = require('path');

// Sample invoice data for testing
const sampleInvoiceData = {
  invoiceNumber: 'FAC-2024-001',
  issueDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-14'),
  
  company: {
    name: 'Simplifaq SA',
    address: '123 Avenue de la Gare',
    city: 'Lausanne',
    postalCode: '1000',
    country: 'Suisse',
    vatNumber: 'CHE-123.456.789',
    phone: '+41 21 123 45 67',
    email: 'contact@simplifaq.ch',
    website: 'www.simplifaq.ch',
  },
  
  client: {
    name: 'Client Test SA',
    address: '456 Rue du Commerce',
    city: 'Genève',
    postalCode: '1201',
    country: 'Suisse',
    vatNumber: 'CHE-987.654.321',
  },
  
  items: [
    {
      description: 'Développement application web - Phase 1',
      quantity: 30,
      unitPrice: 120.00,
      tvaRate: 8.10,
      total: 3891.60,
    },
    {
      description: 'Consultation technique et architecture',
      quantity: 12,
      unitPrice: 150.00,
      tvaRate: 8.10,
      total: 1945.80,
    },
  ],
  
  subtotal: 5400.00,
  tvaAmount: 437.40,
  total: 5837.40,
  currency: 'CHF',
  
  notes: 'Merci pour votre confiance. Paiement dans les 30 jours.',
  terms: 'Paiement net à 30 jours. Retard de paiement: intérêts de 5% par an.',
};

// Sample QR Bill data for testing
const sampleQRBillData = {
  creditor: {
    name: 'Simplifaq SA',
    addressLine1: '123 Avenue de la Gare',
    postalCode: '1000',
    city: 'Lausanne',
    country: 'CH',
  },
  creditorAccount: 'CH9300762011623852957',
  amount: 5837.40,
  currency: 'CHF',
  referenceType: QRReferenceType.QRR,
  reference: '00000000000000000000000004',
  unstructuredMessage: 'Facture FAC-2024-001 - Merci pour votre confiance',
  debtor: {
    name: 'Client Test SA',
    addressLine1: '456 Rue du Commerce',
    postalCode: '1201',
    city: 'Genève',
    country: 'CH',
  },
};

async function testPDFGeneration() {
  try {
    console.log('Starting PDF generation test...');
    
    const pdfBuffer = await generateInvoicePDFWithQRBill(
      sampleInvoiceData,
      sampleQRBillData
    );

    console.log(`PDF generated successfully! Size: ${pdfBuffer.length} bytes`);

    // Create test output directory
    const testOutputDir = path.join(__dirname, 'test-output', 'manual-test');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Save PDF for manual inspection
    const outputPath = path.join(testOutputDir, 'manual-test-invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF saved to: ${outputPath}`);

    // Verify PDF header
    const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
    if (pdfHeader === '%PDF') {
      console.log('✅ PDF header is valid');
    } else {
      console.log('❌ PDF header is invalid:', pdfHeader);
    }

    console.log('✅ PDF generation test completed successfully!');
  } catch (error) {
    console.error('❌ PDF generation test failed:', error);
    process.exit(1);
  }
}

testPDFGeneration();