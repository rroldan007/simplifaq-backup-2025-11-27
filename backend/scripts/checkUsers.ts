import { PrismaClient } from '@prisma/client';

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n========================================');
    console.log('📊 DIAGNÓSTICO DE USUARIOS EN LA BASE DE DATOS');
    console.log('========================================\n');

    // Get total count
    const totalUsers = await prisma.user.count();
    console.log(`Total de usuarios: ${totalUsers}\n`);

    if (totalUsers === 0) {
      console.log('❌ No hay usuarios en la base de datos.');
      console.log('   Necesitas registrar usuarios primero.\n');
      return;
    }

    // Get detailed user information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isActive: true,
        subscriptionPlan: true,
        emailConfirmed: true,
        emailConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                name: true,
                displayName: true,
              }
            }
          }
        },
        _count: {
          select: {
            invoices: true,
            clients: true,
            products: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('👥 LISTA DE USUARIOS:\n');
    
    users.forEach((user, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Usuario #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID:             ${user.id}`);
      console.log(`Email:          ${user.email}`);
      console.log(`Nombre:         ${user.firstName} ${user.lastName}`);
      console.log(`Empresa:        ${user.companyName}`);
      console.log(`Estado:         ${user.isActive ? '✅ Activo' : '❌ Inactivo'}`);
      console.log(`Plan:           ${user.subscriptionPlan}`);
      console.log(`Email Verificado: ${user.emailConfirmed ? '✅ Sí' : '❌ No'}`);
      if (user.emailConfirmedAt) {
        console.log(`Verificado el:  ${user.emailConfirmedAt.toISOString()}`);
      }
      
      // Subscription info
      if (user.subscription) {
        console.log(`\n📦 Suscripción:`);
        console.log(`   ID:          ${user.subscription.id}`);
        console.log(`   Estado:      ${user.subscription.status}`);
        if (user.subscription.plan) {
          console.log(`   Plan:        ${user.subscription.plan.displayName} (${user.subscription.plan.name})`);
        }
      } else {
        console.log(`\n📦 Suscripción:  Sin suscripción activa`);
      }
      
      // Counts
      console.log(`\n📊 Estadísticas:`);
      console.log(`   Facturas:    ${user._count.invoices}`);
      console.log(`   Clientes:    ${user._count.clients}`);
      console.log(`   Productos:   ${user._count.products}`);
      
      console.log(`\n📅 Fechas:`);
      console.log(`   Creado:      ${user.createdAt.toISOString()}`);
      console.log(`   Actualizado: ${user.updatedAt.toISOString()}`);
      console.log('');
    });

    // Summary statistics
    console.log('\n========================================');
    console.log('📈 RESUMEN');
    console.log('========================================');
    
    const activeUsers = users.filter(u => u.isActive).length;
    const inactiveUsers = users.filter(u => !u.isActive).length;
    const emailVerified = users.filter(u => u.emailConfirmed).length;
    const emailNotVerified = users.filter(u => !u.emailConfirmed).length;
    
    const planCounts = users.reduce((acc, user) => {
      acc[user.subscriptionPlan] = (acc[user.subscriptionPlan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\nTotal Usuarios:         ${totalUsers}`);
    console.log(`  ✅ Activos:           ${activeUsers}`);
    console.log(`  ❌ Inactivos:         ${inactiveUsers}`);
    console.log(`\nEmails Verificados:`);
    console.log(`  ✅ Verificados:       ${emailVerified}`);
    console.log(`  ❌ No verificados:    ${emailNotVerified}`);
    console.log(`\nDistribución por Plan:`);
    Object.entries(planCounts).forEach(([plan, count]) => {
      console.log(`  ${plan}:  ${count}`);
    });
    
    console.log('\n========================================\n');
    
  } catch (error) {
    console.error('❌ Error al consultar usuarios:', error);
    if (error instanceof Error) {
      console.error('Detalles:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
