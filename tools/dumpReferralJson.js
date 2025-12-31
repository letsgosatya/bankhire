const fs = require('fs');
require('dotenv').config();
const { sequelize } = require('../bankhire/src/config/database');
const User = require('../bankhire/src/models/User');
const Referral = require('../bankhire/src/models/Referral');

(async ()=>{
  try{
    await sequelize.authenticate();
    const employee = await User.findOne({ where: { mobile: '7777000001' } });
    const refs = await Referral.findAll({ where: { referrerId: employee ? employee.id : -1 } });
    const out = {
      employee: employee ? employee.toJSON() : null,
      referrals: refs.map(r => r.toJSON())
    };
    fs.writeFileSync('C:/Satya_RealtimeProjects/BankHire/tools/referral_db_dump.json', JSON.stringify(out, null, 2));
    console.log('Dump written to tools/referral_db_dump.json');
    process.exit(0);
  }catch(e){
    fs.writeFileSync('C:/Satya_RealtimeProjects/BankHire/tools/referral_db_dump.json', JSON.stringify({ error: e.message }));
    console.error('Error, wrote error to tools/referral_db_dump.json');
    process.exit(1);
  }
})();