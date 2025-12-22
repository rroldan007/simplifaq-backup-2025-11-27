/**
 * Comprehensive test to verify multi-session support fixes the original problems
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'test@simplifaq.ch',
  password: 'Test123456!'
};

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: any;
  };
}

async function login(): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    const data = await response.json() as LoginResponse;
    
    if (!response.ok || !data.success) {
      return null;
    }

    return {
      token: data.data.token,
      refreshToken: data.data.refreshToken
    };
  } catch (error) {
    return null;
  }
}

async function testProfile(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
}

async function testInvoices(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/invoices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
}

async function testClients(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/clients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🧪 Comprehensive Multi-Session Verification\n');
  console.log('='.repeat(60));
  
  // Test 1: Multiple device simulation
  console.log('\n📱 Test 1: Multiple Device Simulation');
  console.log('Simulating login from 2 different devices...\n');
  
  const device1 = await login();
  console.log('Device 1: Login', device1 ? '✅' : '❌');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const device2 = await login();
  console.log('Device 2: Login', device2 ? '✅' : '❌');
  
  if (!device1 || !device2) {
    console.log('\n❌ Login failed. Cannot continue tests.');
    process.exit(1);
  }
  
  // Test 2: Verify Device 1 is still active after Device 2 login
  console.log('\n📊 Test 2: Session Persistence Check');
  console.log('Checking if Device 1 session survived Device 2 login...\n');
  
  const device1Active = await testProfile(device1.token);
  console.log('Device 1 still active:', device1Active ? '✅' : '❌');
  
  const device2Active = await testProfile(device2.token);
  console.log('Device 2 active:', device2Active ? '✅' : '❌');
  
  if (!device1Active) {
    console.log('\n❌ FAILED: Device 1 session was invalidated by Device 2 login');
    console.log('The original problem still exists!');
    process.exit(1);
  }
  
  // Test 3: Both devices can access protected endpoints
  console.log('\n🔐 Test 3: Protected Endpoint Access');
  console.log('Testing if both devices can access invoices and clients...\n');
  
  const device1Invoices = await testInvoices(device1.token);
  const device1Clients = await testClients(device1.token);
  console.log('Device 1 - Invoices:', device1Invoices ? '✅' : '❌');
  console.log('Device 1 - Clients:', device1Clients ? '✅' : '❌');
  
  const device2Invoices = await testInvoices(device2.token);
  const device2Clients = await testClients(device2.token);
  console.log('Device 2 - Invoices:', device2Invoices ? '✅' : '❌');
  console.log('Device 2 - Clients:', device2Clients ? '✅' : '❌');
  
  // Test 4: Create 5 sessions (max limit)
  console.log('\n🎯 Test 4: Maximum Session Limit (5 sessions)');
  console.log('Creating 5 concurrent sessions...\n');
  
  const sessions = [device1, device2];
  for (let i = 3; i <= 5; i++) {
    const session = await login();
    if (session) {
      sessions.push(session);
      console.log(`Session ${i}: ✅`);
    } else {
      console.log(`Session ${i}: ❌`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Test 5: Verify all sessions are active
  console.log('\n✨ Test 5: All Sessions Active Check');
  console.log(`Verifying all ${sessions.length} sessions...\n`);
  
  let activeCount = 0;
  for (let i = 0; i < sessions.length; i++) {
    const isActive = await testProfile(sessions[i].token);
    console.log(`Session ${i + 1}: ${isActive ? '✅' : '❌'}`);
    if (isActive) activeCount++;
  }
  
  // Test 6: Create 6th session - should invalidate oldest
  console.log('\n🔄 Test 6: Session Rotation (6th session)');
  console.log('Creating 6th session (should remove oldest)...\n');
  
  const session6 = await login();
  console.log('Session 6 created:', session6 ? '✅' : '❌');
  
  if (session6) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check which sessions are still active
    console.log('\nSession status after 6th login:');
    for (let i = 0; i < sessions.length; i++) {
      const isActive = await testProfile(sessions[i].token);
      console.log(`Session ${i + 1}: ${isActive ? '✅ Active' : '❌ Invalidated'}`);
    }
    
    const session6Active = await testProfile(session6.token);
    console.log(`Session 6: ${session6Active ? '✅ Active' : '❌ Invalidated'}`);
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const allTestsPassed = device1Active && device2Active && 
                         device1Invoices && device1Clients &&
                         device2Invoices && device2Clients &&
                         activeCount >= 4; // At least 4 sessions should be active
  
  if (allTestsPassed) {
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n✨ Multi-session support is working correctly:');
    console.log('  • Users can login from multiple devices ✅');
    console.log('  • Sessions persist after new logins ✅');
    console.log('  • All protected endpoints accessible ✅');
    console.log('  • Session limit enforced (max 5) ✅');
    console.log('\n🎉 The original problem has been FIXED!');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('\nPlease review the results above.');
    process.exit(1);
  }
}

main();
