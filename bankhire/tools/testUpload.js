const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

(async () => {
  try {
    const mobile = '9999999999';
    console.log('Sending OTP...');
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });

    console.log('Verifying OTP (123456)...');
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Got token:', !!token);

    const filePath = 'uploads/resume_candidate1.pdf';
    if (!fs.existsSync(filePath)) {
      console.error('Sample resume not found:', filePath);
      process.exit(1);
    }

    const form = new FormData();
    form.append('resume', fs.createReadStream(filePath));
    form.append('jobRole', 'Test Role');

    console.log('Uploading resume...');
    const res = await axios.post('http://localhost:3002/auth/upload-resume', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log('Upload response:', res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.error('Upload failed, status:', err.response.status, 'data:', err.response.data);
    } else {
      console.error('Upload error:', err.message);
    }
    process.exit(1);
  }
})();