const http = require('http');
const data = JSON.stringify({
  name: "Prueba desde local",
  kind: "llamada",
  startDate: Math.floor(Date.now() / 1000),
  desc: "Testing local proxy"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/holded/crm/v1/events',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'key': 'dummy'
  }
}, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('Response:', res.statusCode, b.slice(0, 100)));
});
req.write(data);
req.end();
