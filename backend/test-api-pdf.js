const { generateInvoicePDFWithQRBill } = require('./dist/utils/invoicePDF');
const fs = require('fs');
const path = require('path');

// Simular datos de factura como los que vienen de la base de datos
const mockInvoiceFromDB = {
  id: 'test-invoice-id',
  invoiceNumber: 'FAC-2024-001',
  issueDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-14'),
  status: 'sent',
  subtotal: 5400.00,
  tvaAmount: 437.40,
  total: 5837.40,
  currency: 'CHF',
  notes: 'Merci pour votre confiance. Paiement dans les 30 jours.',
  terms: 'Paiement net à 30 jours. Retard de paiement: intérêts de 5% par an.',
  
  // Datos del usuario/empresa
  user: {
    companyName: 'Simplifaq SA',
    street: '123 Avenue de la Gare',
    postalCode: '1000',
    city: 'Lausanne',
    country: 'Suisse',
    vatNumber: 'CHE-123.456.789',
    phone: '+41 21 123 45 67',
    email: 'contact@simplifaq.ch',
    website: 'www.simplifaq.ch',
    iban: 'CH9300762011623852957',
  },
  
  // Datos del cliente
  client: {
    companyName: 'Client Test SA',
    firstName: null,
    lastName: null,
    street: '456 Rue du Commerce',
    postalCode: '1201',
    city: 'Genève',
    country: 'Suisse',
    vatNumber: 'CHE-987.654.321',
  },
  
  // Items de la factura
  items: [
    {
      description: 'Développement application web - Phase 1',
      quantity: 30,
      unitPrice: 120.00,
      tvaRate: 8.10,
      total: 3891.60,
      order: 1,
    },
    {
      description: 'Consultation technique et architecture',
      quantity: 12,
      unitPrice: 150.00,
      tvaRate: 8.10,
      total: 1945.80,
      order: 2,
    },
  ],
};

// Función para convertir datos de Prisma a formato PDF (como en el controller)
function convertInvoiceToPDFData(invoice) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate),
    dueDate: new Date(invoice.dueDate),
    
    company: {
      name: invoice.user.companyName,
      address: invoice.user.street,
      city: invoice.user.city,
      postalCode: invoice.user.postalCode,
      country: invoice.user.country || 'Suisse',
      vatNumber: invoice.user.vatNumber,
      phone: invoice.user.phone,
      email: invoice.user.email,
      website: invoice.user.website,
    },
    
    client: {
      name: invoice.client.companyName || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim(),
      address: invoice.client.street,
      city: invoice.client.city,
      postalCode: invoice.client.postalCode,
      country: invoice.client.country || 'Suisse',
      vatNumber: invoice.client.vatNumber,
    },
    
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      tvaRate: Number(item.tvaRate),
      total: Number(item.total),
    })),
    
    subtotal: Number(invoice.subtotal),
    tvaAmount: Number(invoice.tvaAmount),
    total: Number(invoice.total),
    currency: invoice.currency,
    
    notes: invoice.notes,
    terms: invoice.terms,
  };
}

// Función para crear QR Bill desde factura (como en el controller)
function createQRBillFromInvoice(invoice) {
  // Generar referencia QR si es necesario
  let reference;
  let referenceType = 'NON';
  
  if (invoice.user.iban) {
    try {
      // Usar ID de factura como base para generar referencia
      const referenceBase = invoice.id.replace(/\D/g, '').slice(0, 10) || '1';
      // Simular generación de referencia QR
      reference = '00000000000000000000000004';
      referenceType = 'QRR';
    } catch (error) {
      console.warn('Could not generate QR reference:', error);
    }
  }

  const qrBillData = {
    creditor: {
      name: invoice.user.companyName,
      addressLine1: invoice.user.street,
      postalCode: invoice.user.postalCode,
      city: invoice.user.city,
      country: invoice.user.country || 'CH',
    },
    creditorAccount: invoice.user.iban || 'CH9300762011623852957',
    amount: Number(invoice.total),
    currency: invoice.currency,
    referenceType,
    reference,
    unstructuredMessage: `Facture ${invoice.invoiceNumber}${invoice.notes ? ` - ${invoice.notes}` : ''}`,
  };

  // Agregar información del deudor si está disponible
  if (invoice.client) {
    qrBillData.debtor = {
      name: invoice.client.companyName || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim(),
      addressLine1: invoice.client.street,
      postalCode: invoice.client.postalCode,
      city: invoice.client.city,
      country: invoice.client.country || 'CH',
    };
  }

  return qrBillData;
}

async function testCompleteAPIFlow() {
  try {
    console.log('🧪 Testing complete API flow for PDF generation...');
    
    // Paso 1: Convertir datos de factura a formato PDF
    console.log('📄 Converting invoice data to PDF format...');
    const invoiceData = convertInvoiceToPDFData(mockInvoiceFromDB);
    
    // Paso 2: Crear datos de QR Bill
    console.log('🏦 Creating QR Bill data...');
    const qrBillData = createQRBillFromInvoice(mockInvoiceFromDB);
    
    // Paso 3: Generar PDF con QR Bill integrado
    console.log('🎯 Generating PDF with integrated QR Bill...');
    const pdfBuffer = await generateInvoicePDFWithQRBill(invoiceData, qrBillData, {
      language: 'fr',
      format: 'A4',
    });

    console.log(`✅ PDF generated successfully! Size: ${pdfBuffer.length} bytes`);

    // Crear directorio de salida
    const testOutputDir = path.join(__dirname, 'test-output', 'api-flow-test');
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Guardar PDF para inspección manual
    const outputPath = path.join(testOutputDir, 'complete-api-flow-test.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`💾 PDF saved to: ${outputPath}`);

    // Verificar encabezado PDF
    const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
    if (pdfHeader === '%PDF') {
      console.log('✅ PDF header is valid');
    } else {
      console.log('❌ PDF header is invalid:', pdfHeader);
    }

    // Probar diferentes idiomas
    console.log('🌍 Testing different languages...');
    const languages = ['fr', 'de', 'it', 'en'];
    
    for (const language of languages) {
      const langPdfBuffer = await generateInvoicePDFWithQRBill(invoiceData, qrBillData, {
        language: language,
        format: 'A4',
      });
      
      const langOutputPath = path.join(testOutputDir, `invoice-${language}.pdf`);
      fs.writeFileSync(langOutputPath, langPdfBuffer);
      console.log(`✅ ${language.toUpperCase()} PDF generated: ${langPdfBuffer.length} bytes`);
    }

    // Probar con muchos items (multi-página)
    console.log('📚 Testing multi-page support...');
    const manyItemsInvoice = {
      ...mockInvoiceFromDB,
      invoiceNumber: 'FAC-2024-MULTIPAGE',
      items: Array.from({ length: 30 }, (_, i) => ({
        description: `Service ${i + 1} - Description détaillée du service fourni avec beaucoup de texte pour tester les sauts de page`,
        quantity: Math.floor(Math.random() * 5) + 1,
        unitPrice: Math.floor(Math.random() * 200) + 50,
        tvaRate: 8.10,
        total: 0,
        order: i + 1,
      })).map(item => ({
        ...item,
        total: item.quantity * item.unitPrice * 1.081,
      })),
      subtotal: 50000,
      tvaAmount: 4050,
      total: 54050,
    };

    const multiPageInvoiceData = convertInvoiceToPDFData(manyItemsInvoice);
    const multiPageQRBillData = createQRBillFromInvoice(manyItemsInvoice);
    
    const multiPagePdfBuffer = await generateInvoicePDFWithQRBill(
      multiPageInvoiceData, 
      multiPageQRBillData
    );
    
    const multiPageOutputPath = path.join(testOutputDir, 'multipage-invoice.pdf');
    fs.writeFileSync(multiPageOutputPath, multiPagePdfBuffer);
    console.log(`✅ Multi-page PDF generated: ${multiPagePdfBuffer.length} bytes`);

    console.log('🎉 All tests completed successfully!');
    console.log(`📁 Test results saved in: ${testOutputDir}`);
    
  } catch (error) {
    console.error('❌ API flow test failed:', error);
    process.exit(1);
  }
}

testCompleteAPIFlow();