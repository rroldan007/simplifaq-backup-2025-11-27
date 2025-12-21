/**
 * Test script to verify multi-session support
 * Creates multiple logins for the same user and verifies they all work
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
      console.error('Login failed:', data);
      return null;
    }

    return {
      token: data.data.token,
      refreshToken: data.data.refreshToken
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function testProfile(token: string, sessionName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ ${sessionName}: Profile access successful`);
      return true;
    } else {
      console.log(`❌ ${sessionName}: Profile access failed -`, data.error?.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error(`❌ ${sessionName}: Error accessing profile:`, error);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Multi-Session Support\n');
  console.log('Creating 3 concurrent sessions for the same user...\n');

  // Create 3 logins for the same user
  const sessions = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`Creating session ${i}...`);
    const session = await login();
    if (session) {
      sessions.push({ name: `Session ${i}`, ...session });
      console.log(`✅ Session ${i} created\n`);
    } else {
      console.log(`❌ Failed to create session ${i}\n`);
    }
  }

  if (sessions.length === 0) {
    console.log('❌ No sessions created. Test failed.');
    process.exit(1);
  }

  console.log(`\n📊 Created ${sessions.length} sessions. Testing if all remain active...\n`);

  // Test all sessions
  const results = await Promise.all(
    sessions.map(session => testProfile(session.token, session.name))
  );

  const successCount = results.filter(r => r).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTS: ${successCount}/${sessions.length} sessions active`);
  console.log('='.repeat(50));

  if (successCount === sessions.length) {
    console.log('\n✅ SUCCESS: Multi-session support is working!');
    console.log('All sessions remain active after multiple logins.');
    process.exit(0);
  } else {
    console.log('\n❌ PARTIAL SUCCESS: Some sessions were invalidated.');
    console.log('Multi-session support may not be fully working.');
    process.exit(1);
  }
}

main();
