import { generateInvoicePDFWithQRBill, InvoiceData, PDFGenerationOptions } from '../utils/invoicePDF';
import { SwissQRBillData, QRReferenceType } from '../utils/swissQRBill';
import fs from 'fs';
import path from 'path';

describe('InvoicePDF Unit Tests', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/invoice-pdf-unit');

  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  // Sample invoice data for testing
  const sampleInvoiceData: InvoiceData = {
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
  const sampleQRBillData: SwissQRBillData = {
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

  describe('Basic PDF Generation', () => {
    it('should generate PDF with Swiss QR Bill integration', async () => {
      const pdfBuffer = await generateInvoicePDFWithQRBill(
        sampleInvoiceData,
        sampleQRBillData
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(10000); // PDF should have reasonable size

      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');

      // Save PDF for manual inspection
      const outputPath = path.join(testOutputDir, 'basic-invoice-with-qr-bill.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`Basic invoice PDF saved to: ${outputPath}`);
    }, 60000);

    it('should generate PDF without debtor information', async () => {
      const qrBillDataWithoutDebtor = { ...sampleQRBillData };
      delete qrBillDataWithoutDebtor.debtor;

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        sampleInvoiceData,
        qrBillDataWithoutDebtor
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save PDF for inspection
      const outputPath = path.join(testOutputDir, 'invoice-no-debtor.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);

    it('should generate PDF without reference', async () => {
      const qrBillDataWithoutRef = {
        ...sampleQRBillData,
        referenceType: QRReferenceType.NON as const,
        reference: undefined,
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        sampleInvoiceData,
        qrBillDataWithoutRef
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save PDF for inspection
      const outputPath = path.join(testOutputDir, 'invoice-no-reference.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);
  });

  describe('Multi-language Support', () => {
    const languages: Array<'de' | 'fr' | 'it' | 'en'> = ['fr', 'de'];

    languages.forEach((language) => {
      it(`should generate PDF in ${language}`, async () => {
        const options: PDFGenerationOptions = { language };
        
        const pdfBuffer = await generateInvoicePDFWithQRBill(
          sampleInvoiceData,
          sampleQRBillData,
          options
        );

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(8000);

        // Save language-specific PDFs
        const outputPath = path.join(testOutputDir, `invoice-${language}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);
      }, 60000);
    });
  });

  describe('Multi-page Support', () => {
    it('should handle invoice with many items (multi-page test)', async () => {
      // Create invoice with many items to test page breaks
      const manyItemsInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-MULTIPAGE',
        items: Array.from({ length: 25 }, (_, i) => ({
          description: `Service ${i + 1} - Description détaillée du service fourni`,
          quantity: Math.floor(Math.random() * 5) + 1,
          unitPrice: Math.floor(Math.random() * 200) + 50,
          tvaRate: 8.10,
          total: 0, // Will be calculated
        })).map(item => ({
          ...item,
          total: item.quantity * item.unitPrice * 1.081,
        })),
        subtotal: 50000,
        tvaAmount: 4050,
        total: 54050,
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        manyItemsInvoice,
        { ...sampleQRBillData, amount: 54050 }
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(15000); // Should be larger with more items

      // Save for page break inspection
      const outputPath = path.join(testOutputDir, 'invoice-multipage.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 90000);
  });

  describe('Currency Support', () => {
    it('should generate PDF with EUR currency', async () => {
      const eurInvoiceData: InvoiceData = {
        ...sampleInvoiceData,
        currency: 'EUR',
        invoiceNumber: 'FAC-2024-EUR',
      };

      const eurQRBillData: SwissQRBillData = {
        ...sampleQRBillData,
        currency: 'EUR',
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        eurInvoiceData,
        eurQRBillData
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save EUR invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-eur-currency.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);
  });

  afterAll(() => {
    console.log(`Unit test PDFs generated in: ${testOutputDir}`);
  });
});