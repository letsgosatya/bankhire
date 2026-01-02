require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async ()=>{
  try{
    const API = 'http://127.0.0.1:3002';
    // ensure employee user exists
    // Use existing test user or prompt - for now we'll assume mobile 9999911111 is an employee from tools
    // send OTP to employee test number (requires USE_HARDCODED_OTP=true in .env)
    await axios.post(`${API}/auth/send-otp`, { mobile: '9999911111' });
    // verify using hardcoded OTP (123456)
    const verifyRes = await axios.post(`${API}/auth/verify-otp`, { mobile: '9999911111', otp: '123456' });
    const token = verifyRes?.data?.token;
    if (!token) {
      console.log('Could not obtain token for employee; verify response:', verifyRes?.data);
      return;
    }

    const filePath = path.join(__dirname, 'sample_resume.txt');
    const form = new (require('form-data'))();
    form.append('candidateMobile', '8888844444');
    form.append('jobId', '1');
    form.append('candidateName', 'Test Candidate');
    form.append('candidateEmail', 'candidate@example.com');
    form.append('resume', fs.createReadStream(filePath));

    const resp = await axios.post(`${API}/referral/create`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` } });
    console.log('Create referral response:', resp.data);
  }catch(e){
    console.error('Test failed', e && e.response && e.response.data ? e.response.data : e.message || e);
  }
})();