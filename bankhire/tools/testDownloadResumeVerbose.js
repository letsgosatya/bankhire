const axios = require('axios');
const fs = require('fs');
(async ()=>{
  try{
    const mobile = '9999999998';
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;

    console.log('Requesting download with token length', token.length);

    const res = await axios.get('http://localhost:3002/auth/download-resume', {
      headers: { Authorization: 'Bearer ' + token },
      responseType: 'stream',
      timeout: 60000,
    });

    console.log('Got status:', res.status, 'headers:', res.headers);
    const ws = fs.createWriteStream('downloads/test_out.pdf');
    res.data.pipe(ws);
    res.data.on('end', () => console.log('Stream ended and written'));
    res.data.on('error', (err) => console.error('Stream error', err));
  }catch(e){
    if(e.response){
      console.error('Download failed, status:', e.response.status, 'data:', e.response.data);
    } else {
      console.error('Download error:', e.message);
    }
    process.exit(1);
  }
})();