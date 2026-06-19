const https = require('https');

function test(path, method, body = null) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.holded.com',
      path,
      method,
      headers: {
        'Accept': 'application/json',
        'key': 'dummy',
        ...(body ? { 'Content-Type': 'application/json'} : {})
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({code: res.statusCode, body: b.slice(0, 500)}));
    });
    if (body) req.write(body);
    req.end();
  });
}

test('/api/crm/v1/events', 'GET').then(console.log);
