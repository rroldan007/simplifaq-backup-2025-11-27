#!/usr/bin/env node

/**
 * Debug invoice status issues
 */

const https = require('https');

// Test with a recent invoice (you'll need to update this with a real invoice ID)
const testInvoiceId = 'cmi1y24go0005iwtlvdcmxaqr'; // From previous tests
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiZW1haWwiOiJkZW1vQGNob2NvbGF0ZXJpZS1zdWlzc2UuY2giLCJpYXQiOjE3NjMzODY3NzAsImV4cCI6MTc2Mzk5MTU3MH0.CdzILBXh1unO1VMh3OfecQIVOxUF2qjm1cgOkfLEX8U';

async function debugInvoiceStatus() {
  console.log('🔍 Debugging Invoice Status Issues...\n');
  
  try {
    // 1. Get invoice details
    console.log('1. Getting invoice details...');
    const invoiceData = await makeRequest(`/api/invoices/${testInvoiceId}`, 'GET');
    
    if (invoiceData.success) {
      const invoice = invoiceData.data;
      console.log('✅ Invoice found:');
      console.log(`   • ID: ${invoice.id}`);
      console.log(`   • Number: ${invoice.invoiceNumber}`);
      console.log(`   • Status: ${invoice.status}`);
      console.log(`   • Sent At: ${invoice.sentAt || 'NOT SET'}`);
      console.log(`   • Email Sent At: ${invoice.emailSentAt || 'NOT SET'}`);
      console.log(`   • Email Sent To: ${invoice.emailSentTo || 'NOT SET'}`);
      console.log(`   • Updated At: ${invoice.updatedAt}`);
    } else {
      console.log('❌ Error getting invoice:', invoiceData.error?.message);
      return;
    }
    
    // 2. Get all invoices to check filter counts
    console.log('\n2. Getting all invoices for filter analysis...');
    const allInvoicesData = await makeRequest('/api/invoices?limit=100', 'GET');
    
    if (allInvoicesData.success) {
      const invoices = allInvoicesData.data.invoices || [];
      console.log(`✅ Found ${invoices.length} total invoices`);
      
      // Count by status
      const statusCounts = {};
      invoices.forEach(inv => {
        statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
      });
      
      console.log('\n📊 Status Counts:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   • ${status}: ${count}`);
      });
      
      // Show draft invoices
      const draftInvoices = invoices.filter(inv => inv.status === 'draft');
      console.log(`\n📋 Draft Invoices (${draftInvoices.length}):`);
      draftInvoices.slice(0, 5).forEach(inv => {
        console.log(`   • ${inv.invoiceNumber} - ${inv.clientName}`);
      });
      if (draftInvoices.length > 5) {
        console.log(`   ... and ${draftInvoices.length - 5} more`);
      }
      
    } else {
      console.log('❌ Error getting invoices:', allInvoicesData.error?.message);
    }
    
    // 3. Check if we can send a test email to trigger status update
    console.log('\n3. Testing email send to trigger status update...');
    console.log('⚠️  This will send a real email - use with caution');
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

function makeRequest(path, method, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'test.simplifaq.ch',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          resolve({ success: false, error: { message: 'Parse error' }, raw: responseData });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: { message: error.message } });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

debugInvoiceStatus().catch(console.error);
