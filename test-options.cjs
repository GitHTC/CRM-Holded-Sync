const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/holded/crm/v1/events',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, key, Accept'
  }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('Response:', res.statusCode, res.headers, b.slice(0, 100)));
});
req.end();
