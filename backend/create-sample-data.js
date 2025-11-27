const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🇨🇭 Creating sample data for demo user...');

    // Find the demo user
    const user = await prisma.user.findUnique({
      where: { email: 'demo@chocolaterie-suisse.ch' }
    });

    if (!user) {
      console.log('❌ Demo user not found');
      return;
    }

    console.log('✅ Found demo user:', user.id);

    // Create sample clients
    const clients = await Promise.all([
      prisma.client.create({
        data: {
          userId: user.id,
          companyName: 'Restaurant Le Petit Suisse',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'contact@petitsuisse.ch',
          phone: '+41 22 123 45 67',
          street: 'Rue du Marché 15',
          city: 'Genève',
          postalCode: '1204',
          country: 'Switzerland',
          canton: 'GE',
          vatNumber: 'CHE-456.789.123 TVA',
          language: 'fr',
          paymentTerms: 30,
          isActive: true
        }
      }),
      prisma.client.create({
        data: {
          userId: user.id,
          companyName: 'Boutique Mode Lausanne',
          firstName: 'Claire',
          lastName: 'Moreau',
          email: 'info@modelausanne.ch',
          phone: '+41 21 987 65 43',
          street: 'Avenue de la Gare 42',
          city: 'Lausanne',
          postalCode: '1003',
          country: 'Switzerland',
          canton: 'VD',
          language: 'fr',
          paymentTerms: 15,
          isActive: true
        }
      })
    ]);

    console.log('✅ Created', clients.length, 'sample clients');

    // Create sample products
    const products = await Promise.all([
      prisma.product.create({
        data: {
          userId: user.id,
          name: 'Consultation IT Senior',
          description: 'Consultation informatique niveau senior',
          unitPrice: 180.00,
          tvaRate: 7.70,
          unit: 'heure',
          isActive: true
        }
      }),
      prisma.product.create({
        data: {
          userId: user.id,
          name: 'Développement Web',
          description: 'Développement d\'applications web sur mesure',
          unitPrice: 150.00,
          tvaRate: 7.70,
          unit: 'heure',
          isActive: true
        }
      }),
      prisma.product.create({
        data: {
          userId: user.id,
          name: 'Formation équipe',
          description: 'Formation technique pour équipes',
          unitPrice: 120.00,
          tvaRate: 2.50,
          unit: 'heure',
          isActive: true
        }
      })
    ]);

    console.log('✅ Created', products.length, 'sample products');

    // Create a sample invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: clients[0].id,
        invoiceNumber: 'INV-2024-001',
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        language: 'fr',
        currency: 'CHF',
        subtotal: 1440.00,
        tvaAmount: 110.88,
        total: 1550.88,
        qrReferenceType: 'NON',
        notes: 'Consultation pour mise en place système de facturation'
      }
    });

    console.log('✅ Created sample invoice:', invoice.invoiceNumber);

    // Create invoice items
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productId: products[0].id,
        description: 'Consultation IT Senior - Analyse système',
        quantity: 8.00,
        unitPrice: 180.00,
        tvaRate: 7.70,
        total: 1440.00,
        order: 1
      }
    });

    console.log('✅ Created invoice item');
    console.log('🎉 Sample data created successfully!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
