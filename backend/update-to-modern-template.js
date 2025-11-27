#!/usr/bin/env node

/**
 * Update user to modern template
 */

const https = require('https');

const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiZW1haWwiOiJkZW1vQGNob2NvbGF0ZXJpZS1zdWlzc2UuY2giLCJpYXQiOjE3NjMzODY3NzAsImV4cCI6MTc2Mzk5MTU3MH0.CdzILBXh1unO1VMh3OfecQIVOxUF2qjm1cgOkfLEX8U';

async function updateToModernTemplate() {
  console.log('🎨 Updating to modern template...\n');
  
  // Update user profile with modern template
  const postData = JSON.stringify({
    pdfTemplate: 'european_minimal' // Modern template
  });
  
  const options = {
    hostname: 'test.simplifaq.ch',
    port: 443,
    path: '/api/auth/me',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${testToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
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
            console.log('✅ User updated to modern template:');
            console.log(`   • New template: european_minimal`);
            console.log(`   • Style: Minimalista europeo`);
            console.log(`   • Colors: Blanco con azul grisáceo`);
          } else {
            console.log('❌ Update failed:');
            console.log(`   • Error: ${response.error?.message}`);
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

updateToModernTemplate().catch(console.error);
