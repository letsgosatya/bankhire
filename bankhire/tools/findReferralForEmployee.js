require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Referral = require('../src/models/Referral');

(async ()=>{
  try{
    await sequelize.authenticate();
    const user = await User.findOne({ where: { mobile: '7777000001' } });
    if(!user){ console.log('Employee not found'); process.exit(1); }
    console.log('Employee id:', user.id);
    const refs = await Referral.findAll({ where: { referrerId: user.id }, order: [['createdAt','DESC']] });
    console.log('Found', refs.length, 'referrals');
    refs.forEach(r => console.log(`ID:${r.id} candidate:${r.candidateMobile} status:${r.status} jobId:${r.jobId}`));
    process.exit(0);
  }catch(e){ console.error('Failed', e); process.exit(2); }
})();