require('dotenv').config();
const { sequelize } = require('../src/config/database');
const Earning = require('../src/models/Earning');

(async ()=>{
  try{
    await sequelize.authenticate();
    console.log('Connected to DB');

    const earnings = await Earning.findAll({ where: { description: null } });
    console.log('Found', earnings.length, 'earnings with null description');

    for(const e of earnings){
      let desc = 'Imported earning';
      if (e.type === 'REFERRAL') desc = 'Seed referral sample';
      else if (e.type === 'COMMISSION') desc = 'Seed commission sample';
      else if (e.type === 'BONUS') desc = 'Seed bonus sample';
      console.log(`Updating earning ${e.id}: set description='${desc}'`);
      e.description = desc;
      await e.save();
    }

    console.log('Backfill complete');
    process.exit(0);
  }catch(e){
    console.error('Backfill failed', e);
    process.exit(2);
  }
})();