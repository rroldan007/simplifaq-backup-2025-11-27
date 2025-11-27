#!/usr/bin/env node

/**
 * Test QR Bill generation via API to verify IBAN handling
 */

const https = require('https');

// Test data - you'll need to replace with actual auth token
const testInvoiceData = {
  clientId: "test-client-id", // Replace with actual client ID
  items: [
    {
      description: "Test Service",
      quantity: 1,
      unitPrice: 100,
      tvaRate: 7.7
    }
  ],
  dueDate: "2025-12-17",
  language: "fr",
  currency: "CHF",
  notes: "Test QR Bill IBAN handling"
};

async function createTestInvoice() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testInvoiceData);
    
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: '/api/invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE' // Replace with actual token
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testQRBillPDF(invoiceId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: `/api/invoices/${invoiceId}/pdf`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE' // Replace with actual token
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTest() {
  console.log('🧪 Testing QR Bill IBAN handling via API...\n');
  
  try {
    console.log('📋 Step 1: Check current user IBAN configuration');
    // You would need to get auth token and check user profile first
    
    console.log('📋 Step 2: Create test invoice');
    console.log('⚠️  This test requires valid authentication');
    console.log('📝 Manual testing steps:');
    console.log('   1. Login to https://test.simplifaq.ch');
    console.log('   2. Go to Settings > Paiements');
    console.log('   3. Configure a valid Swiss IBAN (e.g., CH9300762011623852957)');
    console.log('   4. Create a new invoice');
    console.log('   5. Generate PDF');
    console.log('   6. Check if QR Bill contains YOUR IBAN, not test IBAN');
    console.log('   7. Clear IBAN from settings');
    console.log('   8. Generate another PDF');
    console.log('   9. Verify QR Bill has empty account or shows error');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();
