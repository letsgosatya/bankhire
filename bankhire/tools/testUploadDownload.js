const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
(async () => {
  try {
    const mobile = '9999999996';
    console.log('Sending OTP...');
    await axios.post('http://localhost:3002/auth/send-otp', { mobile });

    console.log('Verifying OTP (123456)...');
    const verify = await axios.post('http://localhost:3002/auth/verify-otp', { mobile, otp: '123456' });
    const token = verify.data.token;
    console.log('Got token (len):', token ? token.length : 0);

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, 'e2e_small.pdf');

    if (!fs.existsSync(filePath)) {
      console.log('Creating small valid PDF...');
      const pdfBytes = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      fs.writeFileSync(filePath, pdfBytes);
    }

    console.log('Uploading file:', filePath, 'size:', fs.statSync(filePath).size);
    const form = new FormData();
    form.append('resume', fs.createReadStream(filePath));
    form.append('jobRole', 'E2E Upload');

    const res = await axios.post('http://localhost:3002/auth/upload-resume', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + token,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
    });

    console.log('Upload response:', res.status, res.data);

    // Now attempt download using same token
    const downloadRes = await axios.get('http://localhost:3002/auth/download-resume', {
      headers: { Authorization: 'Bearer ' + token },
      responseType: 'stream',
      timeout: 60000,
    });

    console.log('Download status:', downloadRes.status);
    const outPath = path.join('downloads', 'e2e_downloaded.pdf');
    if (!fs.existsSync('downloads')) fs.mkdirSync('downloads');
    const ws = fs.createWriteStream(outPath);
    downloadRes.data.pipe(ws);
    downloadRes.data.on('end', () => console.log('Downloaded to', outPath));

  } catch (err) {
    if (err.response) {
      console.error('Failed, status:', err.response.status, 'data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
})();