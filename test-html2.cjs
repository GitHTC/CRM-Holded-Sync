const https = require('https');

function test(path, method, key) {
  return new Promise(resolve => {
    https.request({
      hostname: 'api.holded.com',
      path,
      method,
      headers: { 'Accept': 'application/json', 'key': key }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({path, key, code: res.statusCode, body: b.slice(0, 50)}));
    }).end();
  });
}

(async () => {
  console.log(await test('/api/crm/v1/events', 'GET', 'dummy'));
  console.log(await test('/api/crm/v1/events', 'GET', 'fake_but_valid-looking_key_maybe_1234567890'));
  console.log(await test('/api/crm/v1/eventzz', 'GET', 'dummy'));
  console.log(await test('/api/crm/v1/eventzz', 'GET', 'fake_but_valid-looking_key_maybe_1234567890'));
})();
