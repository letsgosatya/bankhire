require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Referral = require('../src/models/Referral');
const { expireReferrals } = require('../src/services/referralExpiryService');

(async ()=>{
  try{
    await sequelize.sync();

    const [user] = await User.findOrCreate({ where: { mobile: '9999922222' }, defaults: { role: 'EMPLOYEE' } });
    const [job] = await Job.findOrCreate({ where: { title: 'Admin Expiry Test Job' }, defaults: { bankName: 'TEST', location: 'Nowhere', description: 'desc', createdBy: user.id } });

    const ref = await Referral.create({ candidateMobile: '0000000002', jobId: job.id, referrerId: user.id, status: 'REFERRED', expiresAt: new Date(Date.now() - 1000) });

    const res = await expireReferrals();
    console.log('expireReferrals result:', res);

    const expired = await Referral.findAll({ where: { status: 'EXPIRED' } });
    console.log('Expired referrals found:', expired.length);

    if (expired.length > 0){
      console.log('OK: expired referrals exist');
      process.exit(0);
    } else {
      console.error('FAIL: no expired referrals');
      process.exit(2);
    }
  }catch(e){
    console.error('ERR', e);
    process.exit(3);
  }
})();