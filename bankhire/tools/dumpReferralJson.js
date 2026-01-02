require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const Referral = require('../src/models/Referral');
const User = require('../src/models/User');
const Application = require('../src/models/Application');

(async ()=>{
  try{
    await sequelize.authenticate();
    const referrals = await Referral.findAll();
    const applications = await Application.findAll();
    const users = await User.findAll();

    const out = {
      referrals: referrals.map(r=>r.toJSON()),
      applications: applications.map(a=>a.toJSON()),
      users: users.map(u=>u.toJSON()),
      generatedAt: new Date().toISOString()
    };

    const p = path.join(__dirname, 'referral_db_dump.json');
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
    console.log('Wrote DB dump to', p);
    process.exit(0);
  }catch(e){
    console.error('Failed to dump DB', e);
    process.exit(2);
  }
})();