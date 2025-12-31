require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Referral = require('../src/models/Referral');
const { expireReferrals } = require('../src/services/referralExpiryService');

(async ()=>{
  try{
    await sequelize.sync();

    const [user] = await User.findOrCreate({ where: { mobile: '9999911111' }, defaults: { role: 'EMPLOYEE' } });
    const [job] = await Job.findOrCreate({ where: { title: 'Test Job Expiry' }, defaults: { bankName: 'TEST', location:'Nowhere', description:'desc', createdBy: user.id } });

    const ref = await Referral.create({ candidateMobile: '0000000001', jobId: job.id, referrerId: user.id, status: 'REFERRED', expiresAt: new Date(Date.now() - 1000) });

    const res = await expireReferrals();
    console.log('expireReferrals result:', res);

    if (res.count >= 1){
      const refreshed = await Referral.findByPk(ref.id);
      if (refreshed.status === 'EXPIRED'){
        console.log('OK: referral expired');
        process.exit(0);
      } else {
        console.error('FAIL: status not EXPIRED', refreshed.status);
        process.exit(2);
      }
    } else {
      console.error('FAIL: no referrals expired');
      process.exit(2);
    }
  }catch(e){
    console.error('ERR', e);
    process.exit(3);
  }
})();