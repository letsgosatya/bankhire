const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const mobile = '9999999999';
    console.log('Sending OTP...');
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });

    console.log('Verifying OTP (123456)...');
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Got token:', !!token);

    const filePath = path.join(__dirname, '..', 'uploads', 'large_test.pdf');
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 24 * 1024 * 1024) {
      console.log('Creating large test file (~24MB)...');
      const fd = fs.openSync(filePath, 'w');
      const chunk = Buffer.alloc(1024 * 1024, 0x20); // 1MB spaces
      for (let i = 0; i < 24; i++) {
        fs.writeSync(fd, chunk);
      }
      fs.closeSync(fd);
    }

    console.log('Uploading large file:', filePath, 'size:', fs.statSync(filePath).size);
    const form = new FormData();
    form.append('resume', fs.createReadStream(filePath));
    form.append('jobRole', 'Test Large Upload');

    const res = await axios.post('http://localhost:3002/auth/upload-resume', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 120000,
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