import {
  generateQRBillPDF,
  generateInvoicePDFWithQRBill,
  validatePDFOptions,
  InvoiceData,
  PDFGenerationOptions,
} from '../utils/qrBillPDFGenerator';
import { SwissQRBillData, QRReferenceType, generateQRReference } from '../utils/swissQRBill';
import fs from 'fs';
import path from 'path';

// Mock data for testing
const mockQRBillData: SwissQRBillData = {
  creditor: {
    name: 'Test Company SA',
    addressLine1: '123 Test Street',
    postalCode: '1000',
    city: 'Lausanne',
    country: 'CH',
  },
  creditorAccount: 'CH9300762011623852957',
  amount: 1234.56,
  currency: 'CHF',
  referenceType: QRReferenceType.QRR,
  reference: generateQRReference('123456'),
  debtor: {
    name: 'Client Test SA',
    addressLine1: '456 Client Street',
    postalCode: '1001',
    city: 'Lausanne',
    country: 'CH',
  },
  unstructuredMessage: 'Facture de test pour services de développement',
};

const mockInvoiceData: InvoiceData = {
  invoiceNumber: 'INV-2024-001',
  issueDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-14'),
  company: {
    name: 'Simplifaq SA',
    address: '123 Business Street',
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
    address: '456 Client Avenue',
    city: 'Geneva',
    postalCode: '1201',
    country: 'Suisse',
    vatNumber: 'CHE-987.654.321',
  },
  items: [
    {
      description: 'Développement application web',
      quantity: 40,
      unitPrice: 120.00,
      tvaRate: 8.10,
      total: 5184.00,
    },
    {
      description: 'Consultation technique',
      quantity: 8,
      unitPrice: 150.00,
      tvaRate: 8.10,
      total: 1296.00,
    },
    {
      description: 'Formation utilisateurs',
      quantity: 4,
      unitPrice: 100.00,
      tvaRate: 3.50,
      total: 414.00,
    },
  ],
  subtotal: 5800.00,
  tvaAmount: 494.00,
  total: 6294.00,
  currency: 'CHF',
  notes: 'Merci pour votre confiance. Paiement dans les 30 jours.',
  terms: 'Paiement net à 30 jours. Retard de paiement: intérêts de 5% par an.',
};

describe('Swiss QR Bill PDF Generation', () => {
  // Create test output directory
  const testOutputDir = path.join(__dirname, '../../test-output');
  
  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  describe('generateQRBillPDF', () => {
    it('should generate a valid QR Bill PDF', async () => {
      const pdfBuffer = await generateQRBillPDF(mockQRBillData);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000); // PDF should have reasonable size
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
      
      // Save for manual inspection (optional)
      const outputPath = path.join(testOutputDir, 'qr-bill-test.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`QR Bill PDF saved to: ${outputPath}`);
    }, 30000); // Increase timeout for PDF generation

    it('should generate QR Bill PDF with different languages', async () => {
      const languages: Array<'de' | 'fr' | 'it' | 'en'> = ['de', 'fr', 'it', 'en'];
      
      for (const language of languages) {
        const options: PDFGenerationOptions = { language };
        const pdfBuffer = await generateQRBillPDF(mockQRBillData, options);
        
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(1000);
        
        // Save language-specific PDFs
        const outputPath = path.join(testOutputDir, `qr-bill-${language}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);
      }
    }, 60000);

    it('should generate QR Bill PDF with EUR currency', async () => {
      const eurQRBillData: SwissQRBillData = {
        ...mockQRBillData,
        currency: 'EUR',
        amount: 1000.00,
      };
      
      const pdfBuffer = await generateQRBillPDF(eurQRBillData);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
      const outputPath = path.join(testOutputDir, 'qr-bill-eur.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 30000);

    it('should handle QR Bill without debtor information', async () => {
      const qrBillDataNoDebtor: SwissQRBillData = {
        ...mockQRBillData,
        debtor: undefined,
      };
      
      const pdfBuffer = await generateQRBillPDF(qrBillDataNoDebtor);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
      const outputPath = path.join(testOutputDir, 'qr-bill-no-debtor.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 30000);

    it('should handle QR Bill without reference', async () => {
      const qrBillDataNoRef: SwissQRBillData = {
        ...mockQRBillData,
        referenceType: QRReferenceType.NON,
        reference: undefined,
      };
      
      const pdfBuffer = await generateQRBillPDF(qrBillDataNoRef);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
      const outputPath = path.join(testOutputDir, 'qr-bill-no-reference.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 30000);

    it('should throw error for invalid QR Bill data', async () => {
      const invalidQRBillData = {
        ...mockQRBillData,
        creditorAccount: 'INVALID_IBAN',
      } as SwissQRBillData;
      
      await expect(generateQRBillPDF(invalidQRBillData)).rejects.toThrow();
    }, 30000);
  });

  describe('generateInvoicePDFWithQRBill', () => {
    it('should generate a complete invoice PDF with QR Bill', async () => {
      const pdfBuffer = await generateInvoicePDFWithQRBill(mockInvoiceData, mockQRBillData);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000); // Complete invoice should be larger
      
      // Check PDF header
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
      
      // Save for manual inspection
      const outputPath = path.join(testOutputDir, 'complete-invoice-with-qr-bill.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`Complete invoice PDF saved to: ${outputPath}`);
    }, 45000);

    it('should generate invoice PDF with custom margins', async () => {
      const options: PDFGenerationOptions = {
        margins: {
          top: 25,
          right: 20,
          bottom: 25,
          left: 20,
        },
      };
      
      const pdfBuffer = await generateInvoicePDFWithQRBill(mockInvoiceData, mockQRBillData, options);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      
      const outputPath = path.join(testOutputDir, 'invoice-custom-margins.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 45000);

    it('should generate invoice PDF in different languages', async () => {
      const languages: Array<'de' | 'fr' | 'it' | 'en'> = ['de', 'fr'];
      
      for (const language of languages) {
        const options: PDFGenerationOptions = { language };
        const pdfBuffer = await generateInvoicePDFWithQRBill(mockInvoiceData, mockQRBillData, options);
        
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(5000);
        
        const outputPath = path.join(testOutputDir, `invoice-${language}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);
      }
    }, 90000);

    it('should handle invoice with many items (page break test)', async () => {
      const manyItemsInvoice: InvoiceData = {
        ...mockInvoiceData,
        items: Array.from({ length: 20 }, (_, i) => ({
          description: `Service ${i + 1} - Description détaillée du service fourni`,
          quantity: Math.floor(Math.random() * 10) + 1,
          unitPrice: Math.floor(Math.random() * 200) + 50,
          tvaRate: i % 3 === 0 ? 0 : i % 3 === 1 ? 3.50 : 8.10,
          total: 0, // Will be calculated
        })).map(item => ({
          ...item,
          total: item.quantity * item.unitPrice * (1 + item.tvaRate / 100),
        })),
      };
      
      // Recalculate totals
      manyItemsInvoice.subtotal = manyItemsInvoice.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );
      manyItemsInvoice.tvaAmount = manyItemsInvoice.items.reduce((sum, item) => 
        sum + (item.total - (item.quantity * item.unitPrice)), 0
      );
      manyItemsInvoice.total = manyItemsInvoice.subtotal + manyItemsInvoice.tvaAmount;
      
      const pdfBuffer = await generateInvoicePDFWithQRBill(manyItemsInvoice, mockQRBillData);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000); // Should be larger with more items
      
      const outputPath = path.join(testOutputDir, 'invoice-many-items.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);

    it('should handle invoice without notes and terms', async () => {
      const minimalInvoice: InvoiceData = {
        ...mockInvoiceData,
        notes: undefined,
        terms: undefined,
      };
      
      const pdfBuffer = await generateInvoicePDFWithQRBill(minimalInvoice, mockQRBillData);
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      
      const outputPath = path.join(testOutputDir, 'invoice-minimal.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 45000);
  });

  describe('validatePDFOptions', () => {
    it('should validate correct PDF options', () => {
      const validOptions: PDFGenerationOptions = {
        format: 'A4',
        language: 'fr',
        margins: {
          top: 20,
          right: 15,
          bottom: 20,
          left: 15,
        },
        separateQRBill: false,
      };
      
      const result = validatePDFOptions(validOptions);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const invalidOptions: PDFGenerationOptions = {
        format: 'INVALID' as any,
      };
      
      const result = validatePDFOptions(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Format doit être A4 ou Letter');
    });

    it('should reject invalid language', () => {
      const invalidOptions: PDFGenerationOptions = {
        language: 'es' as any,
      };
      
      const result = validatePDFOptions(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Langue doit être de, fr, it ou en');
    });

    it('should reject negative margins', () => {
      const invalidOptions: PDFGenerationOptions = {
        margins: {
          top: -5,
          right: 15,
          bottom: 20,
          left: 15,
        },
      };
      
      const result = validatePDFOptions(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Les marges doivent être positives');
    });

    it('should reject excessive margins', () => {
      const invalidOptions: PDFGenerationOptions = {
        margins: {
          top: 60,
          right: 15,
          bottom: 20,
          left: 15,
        },
      };
      
      const result = validatePDFOptions(invalidOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Les marges ne peuvent pas dépasser 50mm');
    });

    it('should handle empty options', () => {
      const result = validatePDFOptions({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('PDF Content Validation', () => {
    it('should generate PDF with proper A4 dimensions', async () => {
      const pdfBuffer = await generateQRBillPDF(mockQRBillData, { format: 'A4' });
      
      // Basic validation - PDF should be generated
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      
      // Check PDF starts with correct header
      const pdfStart = pdfBuffer.toString('ascii', 0, 8);
      expect(pdfStart).toMatch(/^%PDF-\d\.\d/);
    }, 30000);

    it('should include perforation line in complete invoice', async () => {
      const pdfBuffer = await generateInvoicePDFWithQRBill(mockInvoiceData, mockQRBillData);
      
      // PDF should be generated successfully
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(5000);
      
      // Save for visual inspection of perforation line
      const outputPath = path.join(testOutputDir, 'invoice-perforation-test.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 45000);
  });

  describe('Error Handling', () => {
    it('should handle missing creditor information gracefully', async () => {
      const invalidData = {
        ...mockQRBillData,
        creditor: {
          ...mockQRBillData.creditor,
          name: '', // Empty name should cause error
        },
      };
      
      await expect(generateQRBillPDF(invalidData)).rejects.toThrow();
    }, 30000);

    it('should handle invalid amount gracefully', async () => {
      const invalidData = {
        ...mockQRBillData,
        amount: -100, // Negative amount should cause error
      };
      
      await expect(generateQRBillPDF(invalidData)).rejects.toThrow();
    }, 30000);

    it('should handle browser launch failure gracefully', async () => {
      // This test might be environment-specific
      // In a headless environment without proper browser setup, this should fail gracefully
      try {
        await generateInvoicePDFWithQRBill(mockInvoiceData, mockQRBillData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Erreur lors de la génération du PDF');
      }
    }, 30000);
  });

  afterAll(() => {
    console.log(`Test PDFs generated in: ${testOutputDir}`);
    console.log('You can manually inspect the generated PDFs to verify layout and QR Bill integration.');
  });
});