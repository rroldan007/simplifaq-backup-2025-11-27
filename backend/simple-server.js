const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`[Simple Server] Received ${req.method} request for ${req.url}`);

  const headers = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, PATCH, DELETE, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    console.log('[Simple Server] Responded to OPTIONS request.');
    return;
  }

  res.writeHead(200, headers);
  res.end(JSON.stringify({ message: 'Hello from Simple Server!' }));
  console.log('[Simple Server] Responded to GET/POST request.');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`[Simple Server] Listening on port ${PORT}`);
  console.log('--> Please STOP your main backend server and run this file instead using: node backend/simple-server.js');
});
