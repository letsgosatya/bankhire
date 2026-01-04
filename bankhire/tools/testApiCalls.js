const axios = require('axios');
(async ()=>{
  try{
    const mobile = '9999999910';
    console.log('Sending OTP...');
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });
    console.log('Verifying OTP...');
    const v = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = v.data.token;
    console.log('Token length:', token.length);

    console.log('Calling /jobs...');
    const jobs = await axios.get('http://localhost:3002/jobs');
    console.log('/jobs status:', jobs.status, 'count:', jobs.data.length);

    console.log('Calling /auth/me...');
    const me = await axios.get('http://localhost:3002/auth/me', { headers: { Authorization: 'Bearer ' + token } });
    console.log('/auth/me status:', me.status, 'user id:', me.data.user.id);
  }catch(e){
    if(e.response) console.error('Request failed, status:', e.response.status, 'data:', e.response.data);
    else console.error('Error:', e.message);
    process.exit(1);
  }
})();