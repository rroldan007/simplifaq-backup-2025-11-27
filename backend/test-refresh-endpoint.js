const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testRefreshEndpoint() {
  try {
    console.log('🧪 Testing Token Refresh Endpoint...\n');

    // First, let's try to login to get tokens
    console.log('1. Attempting to login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('Access Token:', loginResponse.data.data.token.substring(0, 20) + '...');
      console.log('Refresh Token:', loginResponse.data.data.refreshToken.substring(0, 20) + '...');
      console.log('Expires At:', loginResponse.data.data.expiresAt);

      const refreshToken = loginResponse.data.data.refreshToken;

      // Test refresh endpoint
      console.log('\n2. Testing refresh endpoint...');
      const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken
      });

      if (refreshResponse.data.success) {
        console.log('✅ Token refresh successful');
        console.log('New Access Token:', refreshResponse.data.data.token.substring(0, 20) + '...');
        console.log('New Refresh Token:', refreshResponse.data.data.refreshToken.substring(0, 20) + '...');
        console.log('New Expires At:', refreshResponse.data.data.expiresAt);

        // Test using new access token
        console.log('\n3. Testing new access token...');
        const profileResponse = await axios.get(`${BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${refreshResponse.data.data.token}`
          }
        });

        if (profileResponse.data.success) {
          console.log('✅ New access token works');
          console.log('User:', profileResponse.data.data.user.email);
        } else {
          console.log('❌ New access token failed');
        }

        // Test invalid refresh token
        console.log('\n4. Testing invalid refresh token...');
        try {
          await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken: 'invalid-token'
          });
          console.log('❌ Invalid token should have failed');
        } catch (error) {
          if (error.response && error.response.status === 401) {
            console.log('✅ Invalid refresh token correctly rejected');
            console.log('Error:', error.response.data.error.message);
          } else {
            console.log('❌ Unexpected error:', error.message);
          }
        }

        // Test missing refresh token
        console.log('\n5. Testing missing refresh token...');
        try {
          await axios.post(`${BASE_URL}/auth/refresh`, {});
          console.log('❌ Missing token should have failed');
        } catch (error) {
          if (error.response && error.response.status === 400) {
            console.log('✅ Missing refresh token correctly rejected');
            console.log('Error:', error.response.data.error.message);
          } else {
            console.log('❌ Unexpected error:', error.message);
          }
        }

      } else {
        console.log('❌ Token refresh failed:', refreshResponse.data);
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ Request failed:', error.response.status, error.response.data);
    } else if (error.request) {
      console.log('❌ No response received. Is the server running on port 3001?');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

console.log('Make sure the backend server is running on port 3001 before running this test.');
console.log('You can start it with: npm run dev\n');

testRefreshEndpoint();