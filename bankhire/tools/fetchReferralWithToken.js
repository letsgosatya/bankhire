const axios = require('axios');

(async ()=>{
  try{
    const v = await axios.post('http://127.0.0.1:3002/auth/verify-otp',{ mobile: '7777000001', otp: '123456' });
    const token = v.data.token;
    console.log('Token:', token);
    const r = await axios.get('http://127.0.0.1:3002/referral/33', { headers: { Authorization: 'Bearer ' + token } });
    console.log('Referral 33:', JSON.stringify(r.data, null, 2));
  }catch(e){
    console.error('ERR', e.response ? e.response.data : e.message);
  }
})();