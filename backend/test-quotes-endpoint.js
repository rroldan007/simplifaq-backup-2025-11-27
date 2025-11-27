const http = require('http');

// Primero debes obtener tu token JWT del navegador o hacer login
// Para este test, intenta con el token que uses en el frontend

const TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Reemplaza esto con tu token real

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/quotes',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers:`, res.headers);

  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
