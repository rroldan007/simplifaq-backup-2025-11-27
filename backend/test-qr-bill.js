#!/usr/bin/env node

/**
 * Test script to verify QR Bill IBAN handling
 */

const { createQRBillFromInvoice } = require('./dist/controllers/invoiceController');

// Mock invoice data with and without IBAN
const testCases = [
  {
    name: 'User with valid IBAN',
    invoice: {
      user: {
        companyName: 'Test Company',
        street: 'Test Street 123',
        postalCode: '8000',
        city: 'Zurich',
        country: 'Switzerland',
        iban: 'CH9300762011623852957' // Valid Swiss IBAN
      },
      client: {
        companyName: 'Test Client',
        street: 'Client Street 456',
        postalCode: '8001',
        city: 'Zurich',
        country: 'Switzerland'
      },
      invoiceNumber: 'TEST-001',
      total: 100.00,
      currency: 'CHF'
    }
  },
  {
    name: 'User without IBAN',
    invoice: {
      user: {
        companyName: 'Test Company',
        street: 'Test Street 123',
        postalCode: '8000',
        city: 'Zurich',
        country: 'Switzerland',
        iban: '' // Empty IBAN
      },
      client: {
        companyName: 'Test Client',
        street: 'Client Street 456',
        postalCode: '8001',
        city: 'Zurich',
        country: 'Switzerland'
      },
      invoiceNumber: 'TEST-002',
      total: 200.00,
      currency: 'CHF'
    }
  }
];

async function testQRBill() {
  console.log('🧪 Testing QR Bill IBAN handling...\n');
  
  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    
    try {
      const qrBillData = await createQRBillFromInvoice(testCase.invoice);
      
      console.log('✅ QR Bill generated successfully');
      console.log(`   Creditor: ${qrBillData.creditor.name}`);
      console.log(`   Account: ${qrBillData.creditorAccount || 'EMPTY'}`);
      console.log(`   Amount: ${qrBillData.amount} ${qrBillData.currency}`);
      console.log(`   Reference: ${qrBillData.reference || 'NONE'}`);
      
      // Verify IBAN handling
      if (testCase.invoice.user.iban) {
        if (qrBillData.creditorAccount === testCase.invoice.user.iban.replace(/\s+/g, '').toUpperCase()) {
          console.log('   ✅ User IBAN used correctly');
        } else {
          console.log('   ❌ User IBAN not used correctly');
        }
      } else {
        if (!qrBillData.creditorAccount) {
          console.log('   ✅ No IBAN used when user has no IBAN configured');
        } else {
          console.log('   ❌ Test/fallback IBAN used when user has no IBAN');
        }
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    console.log('---\n');
  }
}

testQRBill().catch(console.error);
