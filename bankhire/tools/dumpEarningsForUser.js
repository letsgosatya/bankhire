require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Earning = require('../src/models/Earning');

(async ()=>{
  try{
    await sequelize.authenticate();
    const user = await User.findOne({ where: { mobile: '7777000001' } });
    if(!user) throw new Error('User not found');
    console.log('User id:', user.id);
    const earnings = await Earning.findAll({ where: { userId: user.id }, order: [['createdAt','DESC']] });
    console.log('Earnings count:', earnings.length);
    earnings.forEach(e => {
      console.log(`ID:${e.id} AMT:${e.amount} TYPE:${e.type} REFERRAL_ID:${e.referralId} DESC:${e.description}`);
    });
    const out = earnings.map(e=>e.toJSON());
    fs.writeFileSync(path.join(__dirname,'earnings_dump.json'), JSON.stringify(out,null,2));
    console.log('Wrote earnings_dump.json');
    process.exit(0);
  }catch(e){
    console.error('Failed', e);
    process.exit(2);
  }
})();