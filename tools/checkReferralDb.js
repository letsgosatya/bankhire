const { sequelize } = require('../bankhire/src/config/database');
const User = require('../bankhire/src/models/User');
const Referral = require('../bankhire/src/models/Referral');

(async ()=>{
  try{
    await sequelize.authenticate();
    console.log('DB ok');
    const employee = await User.findOne({ where: { mobile: '7777000001' } });
    console.log('Employee:', !!employee, employee ? employee.id : null);
    const refs = await Referral.findAll({ where: { referrerId: employee ? employee.id : -1 } });
    console.log('Referrals count for employee:', refs.length);
    refs.forEach(r => console.log(r.toJSON()));
    process.exit(0);
  }catch(e){
    console.error('ERR', e.message);
    process.exit(1);
  }
})();