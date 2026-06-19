const https = require('https');

const postData = JSON.stringify({
  duration: 60,
  costHour: 0,
  desc: "test",
  time: 1,
  amount: 1,
  date: 1234567890
});

async function check() {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.holded.com',
      path: '/api/projects/v1/projects/1/times',
      method: 'POST',
      headers: { 'Accept': 'application/json', 'key': 'bdcc7b198eb537bde78341775a9e3381', 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({code: res.statusCode, body: b}));
    });
    req.write(postData);
    req.end();
  });
}

(async () => {
    console.log(await check());
})();
