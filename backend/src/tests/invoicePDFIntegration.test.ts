import { generateInvoicePDFWithQRBill, InvoiceData, PDFGenerationOptions } from '../utils/invoicePDF';
import { SwissQRBillData, QRReferenceType } from '../utils/swissQRBill';
import fs from 'fs';
import path from 'path';

// Skip database setup for this test
jest.mock('../services/database', () => ({
  prisma: {},
}));

describe('InvoicePDF Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/invoice-pdf');

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
      {
        description: 'Formation utilisateurs',
        quantity: 8,
        unitPrice: 100.00,
        tvaRate: 8.10,
        total: 864.80,
      },
    ],
    
    subtotal: 6000.00,
    tvaAmount: 486.00,
    total: 6486.00,
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
    amount: 6486.00,
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
    const languages: Array<'de' | 'fr' | 'it' | 'en'> = ['fr', 'de', 'it', 'en'];

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

  describe('Different Formats', () => {
    const formats: Array<'A4' | 'Letter'> = ['A4', 'Letter'];

    formats.forEach((format) => {
      it(`should generate PDF in ${format} format`, async () => {
        const options: PDFGenerationOptions = { format };
        
        const pdfBuffer = await generateInvoicePDFWithQRBill(
          sampleInvoiceData,
          sampleQRBillData,
          options
        );

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(8000);

        // Save format-specific PDFs
        const outputPath = path.join(testOutputDir, `invoice-${format.toLowerCase()}.pdf`);
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
        items: Array.from({ length: 30 }, (_, i) => ({
          description: `Service ${i + 1} - Description détaillée du service fourni avec beaucoup de texte pour tester les sauts de page`,
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

    it('should handle invoice with very long descriptions', async () => {
      const longDescriptionInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-LONGDESC',
        items: [
          {
            description: 'Développement d\'une application web complexe avec architecture microservices, intégration de multiples APIs externes, système d\'authentification avancé, tableau de bord analytique en temps réel, et optimisation des performances pour supporter une charge élevée d\'utilisateurs simultanés',
            quantity: 100,
            unitPrice: 150.00,
            tvaRate: 8.10,
            total: 16215.00,
          },
          {
            description: 'Consultation stratégique et technique incluant analyse des besoins métier, définition de l\'architecture système, choix des technologies appropriées, planification des phases de développement, formation des équipes internes, et accompagnement pour la mise en production avec monitoring et maintenance',
            quantity: 50,
            unitPrice: 200.00,
            tvaRate: 8.10,
            total: 10810.00,
          },
        ],
        subtotal: 25000,
        tvaAmount: 2025,
        total: 27025,
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        longDescriptionInvoice,
        { ...sampleQRBillData, amount: 27025 }
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(10000);

      // Save for long description inspection
      const outputPath = path.join(testOutputDir, 'invoice-long-descriptions.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);
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

  describe('Dynamic Content Height Calculation', () => {
    it('should properly position QR Bill with minimal content', async () => {
      const minimalInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-MINIMAL',
        items: [
          {
            description: 'Service simple',
            quantity: 1,
            unitPrice: 100.00,
            tvaRate: 8.10,
            total: 108.10,
          },
        ],
        subtotal: 100.00,
        tvaAmount: 8.10,
        total: 108.10,
        notes: undefined,
        terms: undefined,
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        minimalInvoice,
        { ...sampleQRBillData, amount: 108.10 }
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save minimal invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-minimal-content.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);

    it('should handle invoice with extensive notes and terms', async () => {
      const extensiveNotesInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-NOTES',
        notes: 'Merci pour votre confiance dans nos services. Cette facture comprend tous les travaux réalisés selon le cahier des charges convenu. Les prestations ont été effectuées avec le plus grand soin et dans le respect des délais impartis. Nous restons à votre disposition pour tout complément d\'information.',
        terms: 'Paiement net à 30 jours. En cas de retard de paiement, des intérêts de retard au taux de 5% par an seront appliqués. Conformément à la loi, nous nous réservons le droit de suspendre nos prestations en cas de non-paiement dans les délais convenus. Tout litige sera soumis aux tribunaux compétents de Lausanne.',
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        extensiveNotesInvoice,
        sampleQRBillData
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(10000);

      // Save extensive notes invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-extensive-notes.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero amounts gracefully', async () => {
      const zeroAmountInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-ZERO',
        items: [
          {
            description: 'Service gratuit',
            quantity: 1,
            unitPrice: 0.00,
            tvaRate: 0.00,
            total: 0.00,
          },
        ],
        subtotal: 0.00,
        tvaAmount: 0.00,
        total: 0.00,
      };

      const zeroQRBillData: SwissQRBillData = {
        ...sampleQRBillData,
        amount: 0.01, // QR Bill requires minimum amount
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        zeroAmountInvoice,
        zeroQRBillData
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save zero amount invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-zero-amount.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);

    it('should handle missing optional company information', async () => {
      const minimalCompanyInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-MINIMAL-COMPANY',
        company: {
          name: 'Entreprise Simple',
          address: 'Rue Simple 1',
          city: 'Ville',
          postalCode: '1000',
          country: 'Suisse',
          // No optional fields
        },
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        minimalCompanyInvoice,
        sampleQRBillData
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save minimal company invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-minimal-company.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);

    it('should handle special characters in text', async () => {
      const specialCharsInvoice: InvoiceData = {
        ...sampleInvoiceData,
        invoiceNumber: 'FAC-2024-SPÉCIAUX',
        company: {
          ...sampleInvoiceData.company,
          name: 'Société Spéciale & Associés SA',
        },
        client: {
          ...sampleInvoiceData.client,
          name: 'Client Spécial "Güter" & Co.',
        },
        items: [
          {
            description: 'Développement d\'API REST avec caractères spéciaux: àáâãäåæçèéêëìíîïñòóôõöøùúûüý',
            quantity: 1,
            unitPrice: 1000.00,
            tvaRate: 8.10,
            total: 1081.00,
          },
        ],
        subtotal: 1000.00,
        tvaAmount: 81.00,
        total: 1081.00,
        notes: 'Notes avec caractères spéciaux: €£¥§©®™',
      };

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        specialCharsInvoice,
        { ...sampleQRBillData, amount: 1081.00 }
      );

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(8000);

      // Save special characters invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-special-characters.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
    }, 60000);
  });

  describe('Performance Tests', () => {
    it('should generate PDF within reasonable time limits', async () => {
      const startTime = Date.now();

      const pdfBuffer = await generateInvoicePDFWithQRBill(
        sampleInvoiceData,
        sampleQRBillData
      );

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(generationTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`PDF generation completed in ${generationTime}ms`);
    }, 60000);

    it('should handle concurrent PDF generation', async () => {
      const concurrentPromises = Array.from({ length: 3 }, (_, i) => 
        generateInvoicePDFWithQRBill(
          { ...sampleInvoiceData, invoiceNumber: `FAC-2024-CONCURRENT-${i + 1}` },
          sampleQRBillData
        )
      );

      const results = await Promise.all(concurrentPromises);

      results.forEach((pdfBuffer, index) => {
        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(8000);

        // Save concurrent PDFs
        const outputPath = path.join(testOutputDir, `invoice-concurrent-${index + 1}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);
      });
    }, 120000);
  });

  afterAll(() => {
    console.log(`Integration test PDFs generated in: ${testOutputDir}`);
  });
});