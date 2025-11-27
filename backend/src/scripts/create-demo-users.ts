#!/usr/bin/env ts-node

/**
 * 🇨🇭 SimpliFaq - Demo Users Creation Script
 * 
 * This script creates demo users for both the SaaS admin panel and the regular application
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import chalk from 'chalk';

const prisma = new PrismaClient();

interface DemoUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  role?: string;
  type: 'admin' | 'user';
}

class DemoUserManager {
  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async createAdminUsers() {
    this.log('🔧 Creating SaaS Admin Users...', 'info');

    const adminUsers: DemoUser[] = [
      {
        email: 'admin@simplifaq.ch',
        password: 'AdminSimpliFaq2024!',
        firstName: 'Super',
        lastName: 'Administrateur',
        role: 'super_admin',
        type: 'admin',
      },
      {
        email: 'support@simplifaq.ch',
        password: 'SupportSimpliFaq2024!',
        firstName: 'Agent',
        lastName: 'Support',
        role: 'support_admin',
        type: 'admin',
      },
      {
        email: 'billing@simplifaq.ch',
        password: 'BillingSimpliFaq2024!',
        firstName: 'Gestionnaire',
        lastName: 'Facturation',
        role: 'billing_admin',
        type: 'admin',
      },
    ];

    for (const userData of adminUsers) {
      try {
        // Check if admin already exists
        const existingAdmin = await prisma.adminUser.findUnique({
          where: { email: userData.email },
        });

        if (existingAdmin) {
          this.log(`Admin user ${userData.email} already exists, skipping...`, 'warning');
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Define permissions based on role
        let permissions = {};
        switch (userData.role) {
          case 'super_admin':
            permissions = {
              users: ['read', 'write', 'delete'],
              subscriptions: ['read', 'write', 'delete'],
              plans: ['read', 'write', 'delete'],
              system: ['read', 'write', 'delete'],
              support: ['read', 'write', 'delete'],
              analytics: ['read'],
              billing: ['read', 'write', 'delete'],
            };
            break;
          case 'support_admin':
            permissions = {
              users: ['read', 'write'],
              subscriptions: ['read'],
              support: ['read', 'write', 'delete'],
              analytics: ['read'],
            };
            break;
          case 'billing_admin':
            permissions = {
              users: ['read'],
              subscriptions: ['read', 'write'],
              billing: ['read', 'write', 'delete'],
              analytics: ['read'],
            };
            break;
        }

        // Create admin user
        const adminUser = await prisma.adminUser.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role!,
            permissions,
            isActive: true,
          },
        });

        this.log(`✅ Admin user created: ${adminUser.email} (${adminUser.role})`, 'success');
      } catch (error) {
        this.log(`❌ Failed to create admin user ${userData.email}: ${error}`, 'error');
      }
    }
  }

  async createRegularUsers() {
    this.log('👥 Creating Regular App Users...', 'info');

    // First, ensure we have plans
    await this.ensurePlansExist();

    const regularUsers: DemoUser[] = [
      {
        email: 'demo@chocolaterie-suisse.ch',
        password: 'DemoUser2024!',
        firstName: 'Marie',
        lastName: 'Dubois',
        companyName: 'Chocolaterie Suisse SA',
        type: 'user',
      },
      {
        email: 'contact@consulting-geneve.ch',
        password: 'ConsultDemo2024!',
        firstName: 'Pierre',
        lastName: 'Martin',
        companyName: 'Consulting Genève Sàrl',
        type: 'user',
      },
      {
        email: 'info@tech-lausanne.ch',
        password: 'TechDemo2024!',
        firstName: 'Sophie',
        lastName: 'Müller',
        companyName: 'Tech Solutions Lausanne SA',
        type: 'user',
      },
    ];

    for (const userData of regularUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          this.log(`Regular user ${userData.email} already exists, skipping...`, 'warning');
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create regular user
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyName: userData.companyName!,
            vatNumber: this.generateSwissVATNumber(),
            phone: this.generateSwissPhone(),
            website: `https://www.${userData.companyName!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.ch`,
            language: 'fr',
            currency: 'CHF',
            subscriptionPlan: 'free',
            street: this.generateSwissAddress().street,
            city: this.generateSwissAddress().city,
            postalCode: this.generateSwissAddress().postalCode,
            country: 'Switzerland',
            canton: this.generateSwissAddress().canton,
            iban: this.generateSwissIBAN(),
            isActive: true,
          },
        });

        // Create a free subscription for the user
        const freePlan = await prisma.plan.findUnique({
          where: { name: 'free' },
        });

        if (freePlan) {
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          await prisma.subscription.create({
            data: {
              userId: user.id,
              planId: freePlan.id,
              status: 'active',
              currentPeriodStart,
              currentPeriodEnd,
              billingEmail: user.email,
            },
          });
        }

        // Create some demo data for the user
        await this.createDemoDataForUser(user.id);

        this.log(`✅ Regular user created: ${user.email} (${user.companyName})`, 'success');
      } catch (error) {
        this.log(`❌ Failed to create regular user ${userData.email}: ${error}`, 'error');
      }
    }
  }

  async ensurePlansExist() {
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'free' },
    });

    if (!freePlan) {
      this.log('Creating default plans...', 'info');
      
      const plans = [
        {
          name: 'free',
          displayName: 'Plan Gratuit',
          description: 'Parfait pour commencer avec la facturation suisse',
          price: 0.00,
          currency: 'CHF',
          maxInvoicesPerMonth: 5,
          maxClientsTotal: 10,
          maxProductsTotal: 5,
          hasEmailSupport: false,
          hasPrioritySupport: false,
          hasAdvancedReports: false,
          hasApiAccess: false,
          hasCustomBranding: false,
          storageLimit: 50,
          hasSwissQRBill: true,
          hasMultiCurrency: false,
          hasMultiLanguage: false,
        },
        {
          name: 'basic',
          displayName: 'Plan Basique',
          description: 'Idéal pour les petites entreprises et freelancers',
          price: 19.90,
          currency: 'CHF',
          maxInvoicesPerMonth: 50,
          maxClientsTotal: 100,
          maxProductsTotal: 50,
          hasEmailSupport: true,
          hasPrioritySupport: false,
          hasAdvancedReports: true,
          hasApiAccess: false,
          hasCustomBranding: false,
          storageLimit: 500,
          hasSwissQRBill: true,
          hasMultiCurrency: true,
          hasMultiLanguage: true,
        },
        {
          name: 'premium',
          displayName: 'Plan Premium',
          description: 'Solution complète pour les entreprises en croissance',
          price: 49.90,
          currency: 'CHF',
          maxInvoicesPerMonth: 500,
          maxClientsTotal: 1000,
          maxProductsTotal: 200,
          hasEmailSupport: true,
          hasPrioritySupport: true,
          hasAdvancedReports: true,
          hasApiAccess: true,
          hasCustomBranding: true,
          storageLimit: 2000,
          hasSwissQRBill: true,
          hasMultiCurrency: true,
          hasMultiLanguage: true,
        },
      ];

      for (const planData of plans) {
        await prisma.plan.create({ data: planData });
      }
    }
  }

  async createDemoDataForUser(userId: string) {
    // Create demo clients
    const clients = [
      {
        userId,
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
        isActive: true,
      },
      {
        userId,
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
        isActive: true,
      },
    ];

    for (const clientData of clients) {
      await prisma.client.create({ data: clientData });
    }

    // Create demo products
    const products = [
      {
        userId,
        name: 'Consultation IT Senior',
        description: 'Consultation informatique niveau senior',
        unitPrice: 180.00,
        tvaRate: 7.70,
        unit: 'heure',
        isActive: true,
      },
      {
        userId,
        name: 'Développement Web',
        description: 'Développement d\'applications web sur mesure',
        unitPrice: 150.00,
        tvaRate: 7.70,
        unit: 'heure',
        isActive: true,
      },
      {
        userId,
        name: 'Formation équipe',
        description: 'Formation technique pour équipes',
        unitPrice: 120.00,
        tvaRate: 2.50,
        unit: 'heure',
        isActive: true,
      },
    ];

    for (const productData of products) {
      await prisma.product.create({ data: productData });
    }
  }

  private generateSwissVATNumber(): string {
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    const formatted = randomNum.toString().replace(/(\d{3})(\d{3})/, '$1.$2.');
    return `CHE-${formatted} TVA`;
  }

  private generateSwissPhone(): string {
    const areaCode = Math.random() > 0.5 ? '21' : '22'; // Lausanne or Geneva
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `+41 ${areaCode} ${number.toString().replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3')}`;
  }

  private generateSwissIBAN(): string {
    const bankCode = '0076'; // UBS example
    const accountNumber = Math.floor(Math.random() * 900000000) + 100000000;
    return `CH93 ${bankCode} 2011 ${accountNumber.toString().replace(/(\d{4})(\d{4})(\d{1})/, '$1 $2 $3')}`;
  }

  private generateSwissAddress() {
    const addresses = [
      { street: 'Rue de la Paix 12', city: 'Genève', postalCode: '1202', canton: 'GE' },
      { street: 'Avenue du Léman 25', city: 'Lausanne', postalCode: '1006', canton: 'VD' },
      { street: 'Bahnhofstrasse 45', city: 'Zürich', postalCode: '8001', canton: 'ZH' },
      { street: 'Freie Strasse 18', city: 'Basel', postalCode: '4001', canton: 'BS' },
      { street: 'Rue du Rhône 33', city: 'Genève', postalCode: '1204', canton: 'GE' },
    ];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  async writeCredentialsToFile() {
    this.log('📝 Writing credentials to access file...', 'info');

    const credentialsContent = `# 🇨🇭 SimpliFaq - Credenciales de Acceso
# Generado automáticamente el ${new Date().toLocaleString('es-ES')}

## ADMINISTRACIÓN SAAS
# Panel de administración: http://localhost:5173/admin

### Super Administrador (Acceso completo)
Email: admin@simplifaq.ch
Password: AdminSimpliFaq2024!
Rol: super_admin
Permisos: Todos los permisos del sistema

### Administrador de Soporte
Email: support@simplifaq.ch
Password: SupportSimpliFaq2024!
Rol: support_admin
Permisos: Gestión de usuarios y tickets de soporte

### Administrador de Facturación
Email: billing@simplifaq.ch
Password: BillingSimpliFaq2024!
Rol: billing_admin
Permisos: Gestión de suscripciones y facturación

## APLICACIÓN REGULAR
# Aplicación principal: http://localhost:5173

### Usuario Demo 1 - Chocolaterie
Email: demo@chocolaterie-suisse.ch
Password: DemoUser2024!
Empresa: Chocolaterie Suisse SA
Plan: Gratuito
Datos: Incluye clientes y productos de demostración

### Usuario Demo 2 - Consulting
Email: contact@consulting-geneve.ch
Password: ConsultDemo2024!
Empresa: Consulting Genève Sàrl
Plan: Gratuito
Datos: Incluye clientes y productos de demostración

### Usuario Demo 3 - Tech Solutions
Email: info@tech-lausanne.ch
Password: TechDemo2024!
Empresa: Tech Solutions Lausanne SA
Plan: Gratuito
Datos: Incluye clientes y productos de demostración

## NOTAS IMPORTANTES
- Todos los usuarios tienen datos de demostración preconfigurados
- Los usuarios regulares tienen clientes, productos y pueden crear facturas
- Los administradores pueden gestionar todos los aspectos del SaaS
- Las contraseñas siguen las políticas de seguridad (8+ caracteres, mayúsculas, números, símbolos)
- Los números de IVA, IBAN y teléfonos son ficticios pero con formato suizo válido

## FUNCIONALIDADES DISPONIBLES
### Para Usuarios Regulares:
- Crear y gestionar facturas con QR Bills suizos
- Gestionar clientes y productos
- Generar reportes TVA
- Enviar facturas por email
- Dashboard financiero

### Para Administradores:
- Dashboard con métricas SaaS
- Gestión completa de usuarios
- Gestión de suscripciones y planes
- Analytics y reportes avanzados
- Configuración del sistema
- Auditoría de acciones

## ACCESO RÁPIDO
1. Iniciar el backend: cd backend && npm run dev
2. Iniciar el frontend: cd frontend && npm run dev
3. Acceder a la app: http://localhost:5173
4. Acceder al admin: http://localhost:5173/admin

¡Sistema completamente operativo y listo para usar!
`;

    try {
      // Write to accesos file
      const fs = require('fs');
      fs.writeFileSync('accesos', credentialsContent);
      this.log('✅ Credentials written to "accesos" file', 'success');
    } catch (error) {
      this.log(`❌ Failed to write credentials file: ${error}`, 'error');
    }
  }

  async createAllUsers() {
    try {
      this.log('🇨🇭 Starting SimpliFaq Demo Users Creation...', 'info');

      await this.createAdminUsers();
      await this.createRegularUsers();
      await this.writeCredentialsToFile();

      this.log('🎉 All demo users created successfully!', 'success');
      this.log('📄 Check the "accesos" file for login credentials', 'info');
    } catch (error) {
      this.log(`❌ Fatal error: ${error}`, 'error');
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🇨🇭 SimpliFaq Demo Users Creation Script

Usage: npm run create-demo-users [options]

Options:
  --help          Show this help message
  --admin-only    Create only admin users
  --users-only    Create only regular users

Examples:
  npm run create-demo-users
  npm run create-demo-users --admin-only
  npm run create-demo-users --users-only
    `);
    process.exit(0);
  }

  const userManager = new DemoUserManager();

  if (args.includes('--admin-only')) {
    await userManager.createAdminUsers();
    await userManager.writeCredentialsToFile();
  } else if (args.includes('--users-only')) {
    await userManager.createRegularUsers();
    await userManager.writeCredentialsToFile();
  } else {
    await userManager.createAllUsers();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { DemoUserManager };