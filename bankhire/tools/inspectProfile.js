const axios = require('axios');
(async ()=>{
  try{
    const mobile = '9999999998';
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Token obtained');
    const res = await axios.get('http://localhost:3002/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(res.data, null, 2));
  }catch(e){
    console.error('Error:', e.response ? e.response.data : e.message);
  }
})();