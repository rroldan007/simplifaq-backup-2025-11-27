#!/usr/bin/env node
/**
 * Update email templates in database
 * Run: node update-email-templates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateEmailTemplates() {
  console.log('🔄 Updating email templates...');
  
  try {
    // Run the seed script
    console.log('📧 Running email template seed...');
    const { execSync } = require('child_process');
    execSync('npx tsx src/scripts/seedEmailTemplates.ts', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log('✅ Email templates updated successfully!');
  } catch (error) {
    console.error('❌ Error updating email templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateEmailTemplates();
