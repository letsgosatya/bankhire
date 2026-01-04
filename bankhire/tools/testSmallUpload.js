const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const mobile = '9999999998';
    console.log('Sending OTP...');
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });

    console.log('Verifying OTP (123456)...');
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Got token:', !!token);

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, 'small_valid.pdf');

    if (!fs.existsSync(filePath)) {
      console.log('Creating small valid PDF...');
      const pdfBytes = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      fs.writeFileSync(filePath, pdfBytes);
    }

    console.log('Uploading small file:', filePath, 'size:', fs.statSync(filePath).size);
    const form = new FormData();
    form.append('resume', fs.createReadStream(filePath));
    form.append('jobRole', 'Test Small Upload');

    const res = await axios.post('http://localhost:3002/auth/upload-resume', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
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