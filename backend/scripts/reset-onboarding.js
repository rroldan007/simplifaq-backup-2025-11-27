#!/usr/bin/env node

/**
 * Script para resetear onboarding de usuario (SQLite o PostgreSQL)
 * Funciona en cualquier base de datos que use Prisma
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║    RESETEAR ONBOARDING PARA PRUEBAS                        ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  console.log('');

  try {
    // Listar usuarios
    log('📋 Usuarios disponibles:', 'blue');
    console.log('');

    const users = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        onboarding: true
      }
    });

    if (users.length === 0) {
      log('❌ No hay usuarios en la base de datos', 'red');
      log('Crea un usuario primero en http://localhost:3000/register', 'yellow');
      process.exit(1);
    }

    console.log('Email'.padEnd(30) + 'Empresa'.padEnd(25) + 'Onboarding'.padEnd(15) + 'Welcome');
    console.log('─'.repeat(85));

    users.forEach(user => {
      const onboarding = user.onboarding?.isCompleted ? '✅ Completo' : '⏳ Pendiente';
      const welcome = user.onboarding?.welcomeMessageShown ? '✅ Visto' : '❌ No visto';
      console.log(
        user.email.padEnd(30) + 
        (user.companyName || 'N/A').padEnd(25) + 
        onboarding.padEnd(15) + 
        welcome
      );
    });

    console.log('');
    
    // Preguntar por el email
    const userEmail = await question(colors.yellow + 'Ingresa el EMAIL del usuario: ' + colors.reset);

    if (!userEmail) {
      log('❌ Email no puede estar vacío', 'red');
      process.exit(1);
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { onboarding: true }
    });

    if (!user) {
      log(`❌ Usuario no encontrado: ${userEmail}`, 'red');
      process.exit(1);
    }

    log(`✅ Usuario encontrado: ${user.id}`, 'green');
    console.log('');
    log('⚠️  Esto reseteará completamente el onboarding del usuario:', 'yellow');
    console.log('   • Welcome modal volverá a aparecer');
    console.log('   • Todos los pasos se marcarán como no completados');
    console.log('   • El progreso volverá a 0%');
    console.log('');

    const confirm = await question('¿Continuar? (escribe \'SI\' para confirmar): ');

    if (confirm !== 'SI') {
      log('❌ Cancelado', 'yellow');
      process.exit(0);
    }

    console.log('');
    log('🔄 Reseteando onboarding...', 'blue');

    // Eliminar registro existente
    if (user.onboarding) {
      await prisma.userOnboarding.delete({
        where: { userId: user.id }
      });
    }

    // Crear nuevo registro limpio
    await prisma.userOnboarding.create({
      data: {
        userId: user.id,
        companyInfoCompleted: false,
        logoUploaded: false,
        financialInfoCompleted: false,
        smtpConfigured: false,
        firstClientCreated: false,
        firstProductCreated: false,
        firstInvoiceCreated: false,
        isCompleted: false,
        currentStep: 'company_info',
        skippedSteps: [],
        welcomeMessageShown: false
      }
    });

    log('✅ Onboarding reseteado exitosamente', 'green');
    console.log('');
    log('📝 Estado actual:', 'blue');

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { onboarding: true }
    });

    console.log('');
    console.log(`Email:              ${updatedUser.email}`);
    console.log(`Paso actual:        ${updatedUser.onboarding?.currentStep}`);
    console.log(`Completado:         ${updatedUser.onboarding?.isCompleted}`);
    console.log(`Welcome visto:      ${updatedUser.onboarding?.welcomeMessageShown}`);
    console.log('');

    log('🎉 ¡Listo para probar!', 'green');
    console.log('');
    log('💡 Próximos pasos:', 'yellow');
    console.log('   1. Ve a http://localhost:3000');
    console.log('   2. Cierra sesión si estás logueado');
    console.log(`   3. Inicia sesión con: ${colors.blue}${userEmail}${colors.reset}`);
    console.log(`   4. ${colors.green}✨ El Welcome Modal debería aparecer automáticamente${colors.reset}`);
    console.log('   5. Prueba el flujo completo del onboarding (7 pasos)');
    console.log('');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
