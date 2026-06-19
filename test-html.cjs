const https = require('https');

function test(path, method) {
  return new Promise(resolve => {
    https.request({
      hostname: 'api.holded.com',
      path,
      method,
      headers: { 'Accept': 'application/json', 'key': 'fake_but_valid-looking_key_maybe' }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({code: res.statusCode, body: b.slice(0, 50)}));
    }).end();
  });
}

test('/api/crm/v1/this_does_not_exist', 'GET').then(console.log);
