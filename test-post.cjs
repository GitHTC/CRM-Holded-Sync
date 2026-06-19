const https = require('https');
async function test() {
  const data = JSON.stringify({
    name: "Llamada de prueba",
    kind: "llamada",
    startDate: Math.floor(Date.now() / 1000),
    desc: "Test call"
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.holded.com',
      path: '/api/crm/v1/events',
      method: 'POST',
      headers: { 
        'Accept': 'application/json', 
        'Content-Type': 'application/json',
        'key': 'dummy' 
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({code: res.statusCode, body: b.slice(0, 100)}));
    });
    req.write(data);
    req.end();
  });
}
test().then(console.log);
