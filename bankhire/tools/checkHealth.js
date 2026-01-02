const http = require('http');
const port = process.env.PORT || 3002;
http.get(`http://localhost:${port}/health`, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('status', res.statusCode, d);
    process.exit(0);
  });
}).on('error', e => { console.error('err', e.message); process.exit(1); });