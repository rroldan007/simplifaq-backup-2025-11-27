#!/usr/bin/env node

/**
 * Test email after template fix
 */

const https = require('https');

const testInvoiceId = 'cmi1y24go0005iwtlvdcmxaqr';
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiZW1haWwiOiJkZW1vQGNob2NvbGF0ZXJpZS1zdWlzc2UuY2giLCJpYXQiOjE3NjMzODY3NzAsImV4cCI6MTc2Mzk5MTU3MH0.CdzILBXh1unO1VMh3OfecQIVOxUF2qjm1cgOkfLEX8U';

async function testEmailAfterFix() {
  console.log('🧪 Testing email after template fix...\n');
  
  // Test user config first
  console.log('📋 Check user config:');
  await testUserConfig(testToken);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test sending email
  console.log('📧 Send email test:');
  await testSendEmail(testInvoiceId, testToken);
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
            console.log(`   • PDF Template: ${user.pdfTemplate || 'NOT SET'}`);
            console.log(`   • SMTP Config: ${user.hasSmtpConfig ? '✅' : '❌'}`);
          }
        } catch (error) {
          console.log('❌ Error:', error.message);
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
    const postData = JSON.stringify({
      recipientEmail: 'test@example.com',
      customSubject: 'Test Invoice After Fix',
      customBody: 'Template should work now'
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
            console.log('✅ Email sent successfully!');
            console.log(`   • Sent to: ${response.data.sentTo}`);
            console.log(`   • Sent at: ${response.data.sentAt}`);
          } else {
            console.log('❌ Email send failed:');
            console.log(`   • Error: ${response.error?.message}`);
            console.log(`   • Code: ${response.error?.code}`);
            
            if (response.error?.message?.includes('SMTP')) {
              console.log('   🔧 Next step: Configure SMTP in Settings');
            }
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

    req.write(postData);
    req.end();
  });
}

testEmailAfterFix().catch(console.error);
