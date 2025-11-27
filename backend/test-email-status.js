#!/usr/bin/env node

/**
 * Test script to verify invoice status updates when sending email
 */

const https = require('https');

// Test function to check invoice status before and after email
async function testInvoiceEmailStatus() {
  console.log('🧪 Testing invoice email status update...\n');
  
  try {
    // Step 1: Create a test invoice (should start with 'draft' status)
    console.log('📋 Step 1: Creating test invoice...');
    
    const createInvoiceData = {
      clientId: "test-client-id", // Replace with actual client ID
      items: [
        {
          description: "Test Service for Email",
          quantity: 1,
          unitPrice: 150,
          tvaRate: 7.7
        }
      ],
      dueDate: "2025-12-17",
      language: "fr",
      currency: "CHF",
      notes: "Test invoice for email status verification"
    };

    // You would need to replace with actual auth token and client ID
    console.log('⚠️  This test requires actual authentication and client data');
    console.log('📝 Manual testing steps:');
    console.log('');
    console.log('1. Login to https://test.simplifaq.ch');
    console.log('2. Create a new invoice (should appear as "Brouillon")');
    console.log('3. Note the invoice ID from the URL or network tab');
    console.log('4. Send the invoice by email using the email button');
    console.log('5. Refresh the invoice list - it should now appear as "Envoyée"');
    console.log('6. Check the network tab for the API call to /api/invoices/:id/send-email');
    console.log('');
    console.log('🔍 Expected behavior:');
    console.log('- Before email: status = "draft"');
    console.log('- After email: status = "sent"');
    console.log('- Frontend should show: "Brouillon" → "Envoyée"');
    console.log('');
    console.log('🐛 If it still shows as "Brouillon":');
    console.log('- Check browser network tab for API response');
    console.log('- Check backend logs for status update');
    console.log('- Verify database has status = "sent"');
    
  } catch (error) {
    console.error('❌ Test setup error:', error.message);
  }
}

// Check if backend is using correct status values
async function checkBackendStatusConsistency() {
  console.log('🔍 Checking backend status consistency...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check email controller
    const emailControllerPath = path.join(__dirname, 'src/controllers/emailController.ts');
    const emailController = fs.readFileSync(emailControllerPath, 'utf8');
    
    const hasCorrectDraftCheck = emailController.includes("invoice.status === 'draft'");
    const hasCorrectSentUpdate = emailController.includes("data: { status: 'sent' }");
    
    console.log('📧 Email Controller:');
    console.log(`   ✅ Checks for 'draft' status: ${hasCorrectDraftCheck ? 'YES' : 'NO'}`);
    console.log(`   ✅ Updates to 'sent' status: ${hasCorrectSentUpdate ? 'YES' : 'NO'}`);
    
    // Check invoice controller
    const invoiceControllerPath = path.join(__dirname, 'src/controllers/invoiceController.ts');
    const invoiceController = fs.readFileSync(invoiceControllerPath, 'utf8');
    
    const hasCorrectStatusCreation = invoiceController.includes("status: 'draft'") && !invoiceController.includes("status: 'DRAFT'");
    const hasCorrectStatusUpdate = invoiceController.includes("status: 'sent'") && !invoiceController.includes("status: 'SENT'");
    
    console.log('📄 Invoice Controller:');
    console.log(`   ✅ Creates with 'draft' status: ${hasCorrectStatusCreation ? 'YES' : 'NO'}`);
    console.log(`   ✅ Uses 'sent' status consistently: ${hasCorrectStatusUpdate ? 'YES' : 'NO'}`);
    
    // Check enum definition
    const modelsPath = path.join(__dirname, 'src/models/invoiceModels.ts');
    const models = fs.readFileSync(modelsPath, 'utf8');
    
    const hasCorrectEnum = models.includes("DRAFT = 'draft'") && models.includes("SENT = 'sent'");
    
    console.log('📋 Invoice Models:');
    console.log(`   ✅ Enum uses lowercase values: ${hasCorrectEnum ? 'YES' : 'NO'}`);
    
    console.log('\n🎯 All status consistency checks completed!');
    
  } catch (error) {
    console.error('❌ Error checking consistency:', error.message);
  }
}

async function runTests() {
  await testInvoiceEmailStatus();
  console.log('\n' + '='.repeat(60) + '\n');
  await checkBackendStatusConsistency();
}

runTests();
