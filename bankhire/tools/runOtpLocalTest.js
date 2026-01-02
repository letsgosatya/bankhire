const fs = require('fs');
const path = require('path');
(async ()=>{
  try{
    process.env.USE_HARDCODED_OTP='true';
    const { sendOTP, verifyOTP } = require('../src/services/otpService');
    const variants = [
      '4444444444',
      '91' + '4444444444',
      '+91 4444444444',
      '91-44444 44444'
    ];

    for (const v of variants) {
      console.log('\n--- Testing with input:', v, '---');
      await sendOTP(v);
      console.log('sendOTP done, now verify with same format');
      const ok = await verifyOTP(v, '123456');
      console.log('verify result for same format:', ok);

      const alt = variants[(variants.indexOf(v) + 1) % variants.length];
      console.log('verify using alternate format:', alt);
      const ok2 = await verifyOTP(alt, '123456');
      console.log('verify result for alternate format:', ok2);
    }

    const DATA_DIR = path.join(__dirname, '..', 'data');
    const FILE = path.join(DATA_DIR, 'otp_store.json');
    if (fs.existsSync(FILE)) {
      const raw = fs.readFileSync(FILE, 'utf8');
      console.log('\nstore file content:', raw);
    } else {
      console.log('\nstore file missing');
    }
  }catch(e){
    console.error('error', e);
  }
})();