const axios = require('axios');
const fs = require('fs');
(async ()=>{
  try{
    const mobile = '9999999998';
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Got token:', !!token);

    const res = await axios.get('http://localhost:3002/auth/download-resume', {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    console.log('Download response status:', res.status, 'size:', res.data.length);
    fs.writeFileSync('downloads/downloaded_resume.pdf', Buffer.from(res.data));
    console.log('Saved to downloads/downloaded_resume.pdf');
  }catch(e){
    console.error('Download error:', e.response ? e.response.status : e.message);
    process.exit(1);
  }
})();