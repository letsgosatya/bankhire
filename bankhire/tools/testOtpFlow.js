const { sendOTP, verifyOTP } = require('../src/services/otpService');

(async ()=>{
  try{
    const mobile = '4444444444';
    console.log('Sending OTP in hardcoded mode to', mobile);
    await sendOTP(mobile);
    const ok = await verifyOTP(mobile, '123456');
    console.log('verify immediate:', ok);
    // immediate second verification should be allowed within grace period
    const okAgain = await verifyOTP(mobile, '123456');
    console.log('verify again immediate (grace):', okAgain);
    // try verifying with leading 91 (alternate key format) should also be allowed within grace
    const ok2 = await verifyOTP('91' + mobile, '123456');
    console.log('verify with country prefix:', ok2);
  }catch(e){
    console.error('test failed', e);
  }
})();