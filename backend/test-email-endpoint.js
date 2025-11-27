#!/usr/bin/env node

/**
 * Test script to debug email endpoint issues
 */

const https = require('https');

// Test data
const testInvoiceId = 'cmi1y24go0005iwtlvdcmxaqr'; // From error log
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiZW1haWwiOiJkZW1vQGNob2NvbGF0ZXJpZS1zdWlzc2UuY2giLCJpYXQiOjE3NjMzODY3NzAsImV4cCI6MTc2Mzk5MTU3MH0.CdzILBXh1unO1VMh3OfecQIVOxUF2qjm1cgOkfLEX8U';

async function testEmailEndpoint() {
  console.log('🔍 Testing email endpoint...\n');
  
  // Test 1: Check what data is being sent
  console.log('📋 Test 1: Check invoice details');
  await testGetInvoice(testInvoiceId, testToken);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Try sending email with different data
  console.log('📧 Test 2: Try sending email');
  await testSendEmail(testInvoiceId, testToken);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Check user SMTP config
  console.log('⚙️  Test 3: Check user SMTP config');
  await testUserConfig(testToken);
}

async function testGetInvoice(invoiceId, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: `/api/invoices/${invoiceId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          if (response.success) {
            const invoice = response.data;
            console.log('✅ Invoice found:');
            console.log(`   • Invoice Number: ${invoice.invoiceNumber}`);
            console.log(`   • Client Email: ${invoice.client?.email || 'NOT SET'}`);
            console.log(`   • Status: ${invoice.status}`);
            console.log(`   • User has PDF Template: ${invoice.user?.pdfTemplate || 'NOT SET'}`);
          } else {
            console.log('❌ Invoice not found:', response.error?.message);
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      resolve();
    });

    req.end();
  });
}

async function testSendEmail(invoiceId, token) {
  return new Promise((resolve) => {
    // Test with a valid email format
    const postData = JSON.stringify({
      recipientEmail: 'test@example.com', // Valid email format for testing
      customSubject: 'Test Invoice',
      customBody: 'Please find attached invoice'
    });
    
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: `/api/invoices/${invoiceId}/send-email`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ Email sent successfully:');
            console.log(`   • Sent to: ${response.data.sentTo}`);
            console.log(`   • Sent at: ${response.data.sentAt}`);
          } else {
            console.log('❌ Email send failed:');
            console.log(`   • Error: ${response.error?.message}`);
            console.log(`   • Code: ${response.error?.code}`);
            
            // Analyze specific error
            if (response.error?.message?.includes('SMTP')) {
              console.log('   🔧 Solution: Configure SMTP in Settings');
            } else if (response.error?.message?.includes('email')) {
              console.log('   🔧 Solution: Check email format');
            }
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          console.log('Raw response:', data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function testUserConfig(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          if (response.success) {
            const user = response.data.user;
            console.log('✅ User config:');
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Company: ${user.companyName || 'NOT SET'}`);
            console.log(`   • PDF Template: ${user.pdfTemplate || 'NOT SET'}`);
            console.log(`   • IBAN: ${user.iban || 'NOT SET'}`);
            
            // Check if SMTP is configured
            if (user.hasSmtpConfig) {
              console.log(`   • SMTP Config: ✅ Configured`);
            } else {
              console.log(`   • SMTP Config: ❌ NOT CONFIGURED`);
              console.log('   🔧 Solution: Go to Settings → Email → Configure SMTP');
            }
          } else {
            console.log('❌ User not found:', response.error?.message);
          }
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      resolve();
    });

    req.end();
  });
}

testEmailEndpoint().catch(console.error);
