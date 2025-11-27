#!/usr/bin/env node

/**
 * Check invoice status after email send
 */

const https = require('https');

const testInvoiceId = 'cmi1y24go0005iwtlvdcmxaqr'; // From previous tests
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiZW1haWwiOiJkZW1vQGNob2NvbGF0ZXJpZS1zdWlzc2UuY2giLCJpYXQiOjE3NjMzODY3NzAsImV4cCI6MTc2Mzk5MTU3MH0.CdzILBXh1unO1VMh3OfecQIVOxUF2qjm1cgOkfLEX8U';

async function checkInvoiceStatus() {
  console.log('🔍 Checking invoice status after email...\n');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: `/api/invoices/${testInvoiceId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
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
            console.log('📋 Invoice Details:');
            console.log(`   • Invoice Number: ${invoice.invoiceNumber}`);
            console.log(`   • Status: ${invoice.status}`);
            console.log(`   • Sent At: ${invoice.sentAt || 'NOT SET'}`);
            console.log(`   • Email Sent At: ${invoice.emailSentAt || 'NOT SET'}`);
            console.log(`   • Email Sent To: ${invoice.emailSentTo || 'NOT SET'}`);
            console.log('');
            
            if (invoice.status === 'sent') {
              console.log('✅ Status correctly updated to "sent" in database');
              console.log('🔧 If frontend still shows "draft":');
              console.log('   • Refresh the page (F5)');
              console.log('   • Check browser cache');
              console.log('   • Check network tab for API calls');
            } else {
              console.log('❌ Status NOT updated in database');
              console.log(`   • Current status: "${invoice.status}"`);
              console.log('   • Expected: "sent"');
            }
          } else {
            console.log('❌ Error getting invoice:', response.error?.message);
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

checkInvoiceStatus().catch(console.error);
