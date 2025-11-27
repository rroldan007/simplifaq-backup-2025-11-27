const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Usar la configuración centralizada de CORS
import { corsOptions } from './middleware/security.js';
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: 'development',
    database: 'sqlite'
  });
});

// Basic auth routes for development
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;
    
    // Simple validation
    if (!email || !password || !firstName || !lastName || !companyName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tous les champs sont requis' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Un utilisateur avec cet email existe déjà' 
      });
    }

    // Create user (in production, password should be hashed)
    const user = await prisma.user.create({
      data: {
        email,
        password, // In production, use bcrypt to hash
        firstName,
        lastName,
        companyName,
        street: req.body.street || 'Rue de la Paix 1',
        city: req.body.city || 'Lausanne',
        postalCode: req.body.postalCode || '1000',
        country: 'Switzerland',
        canton: req.body.canton || 'VD'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création du compte' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email et mot de passe requis' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.password !== password) { // In production, use bcrypt.compare
      return res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Simple token (in production, use JWT)
    const token = `dev-token-${user.id}-${Date.now()}`;

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la connexion' 
    });
  }
});

// Basic clients endpoint
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: { clients }
    });
  } catch (error) {
    console.error('Clients error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des clients' 
    });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { companyName, email, street, city, postalCode, country, canton } = req.body;
    
    const client = await prisma.client.create({
      data: {
        companyName: companyName || req.body.name,
        email,
        street: street || 'Rue du Client 1',
        city: city || 'Geneva',
        postalCode: postalCode || '1200',
        country: country || 'Switzerland',
        canton: canton || 'GE',
        userId: 'demo-user-id' // In production, get from JWT token
      }
    });

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: { client }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création du client' 
    });
  }
});

// Basic products endpoint
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des produits' 
    });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, unitPrice, tvaRate } = req.body;
    
    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        unitPrice: parseFloat(unitPrice) || 0,
        tvaRate: parseFloat(tvaRate) || 8.1,
        userId: 'demo-user-id' // In production, get from JWT token
      }
    });

    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création du produit' 
    });
  }
});

// Basic invoices endpoint
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        client: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: { invoices }
    });
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des factures' 
    });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { clientId, items, dueDate } = req.body;
    
    // Calculate totals
    let subtotal = 0;
    let tvaAmount = 0;
    
    const invoiceItems = items.map((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemTva = itemTotal * (item.tvaRate || 8.1) / 100;
      
      subtotal += itemTotal;
      tvaAmount += itemTva;
      
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        tvaRate: item.tvaRate || 8.1,
        total: itemTotal,
        order: index
      };
    });
    
    const total = subtotal + tvaAmount;
    const invoiceNumber = `INV-${Date.now()}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        userId: 'demo-user-id', // In production, get from JWT token
        subtotal,
        tvaAmount,
        total,
        dueDate: new Date(dueDate),
        items: {
          create: invoiceItems
        }
      },
      include: {
        client: true,
        items: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Facture créée avec succès',
      data: { invoice }
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de la facture' 
    });
  }
});

// Reports endpoint
app.get('/api/reports/financial-summary', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany();
    
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
    
    res.json({
      success: true,
      data: {
        totalRevenue,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0
      }
    });
  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la génération du rapport' 
    });
  }
});

// Catch all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint non trouvé' 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Erreur interne du serveur' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🇨🇭 SimpliFaq Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database: SQLite (dev.db)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;