require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Referral = require('../src/models/Referral');
const AppSetting = require('../src/models/AppSetting');

function runCmd(cmd){
  return new Promise((resolve, reject) => {
    const p = exec(cmd, { cwd: path.join(__dirname, '..') }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  });
}

(async ()=>{
  try{
    console.log('Running seed.js...');
    await runCmd('node seed.js');
    console.log('Seed completed. Verifying DB...');

    await sequelize.authenticate();

    const employee = await User.findOne({ where: { mobile: '7777000001' } });
    if (!employee) throw new Error('Employee 7777000001 not found after seed');
    console.log('Found employee 7777000001 id=', employee.id);

    // referrals for employee
    const refs = await Referral.findAll({ where: { referrerId: employee.id } });
    console.log('Referrals found for employee:', refs.length);

    // check app setting
    const setting = await AppSetting.findOne();
    if (!setting) throw new Error('No AppSetting row found after seed');
    console.log('AppSetting defaultReferralExpiryDays=', setting.defaultReferralExpiryDays);

    // write a dump for inspection
    const dumpPath = path.join(__dirname, 'referral_db_seed_verify.json');
    fs.writeFileSync(dumpPath, JSON.stringify({ employee: employee.toJSON(), referrals: refs.map(r=>r.toJSON()), setting: setting.toJSON() }, null, 2));
    console.log('Wrote verification dump to', dumpPath);

    console.log('Seed & DB verification succeeded');
    process.exit(0);
  }catch(e){
    console.error('Seed & verify failed:', e && e.err ? e.err : e.message || e);
    if (e && e.stdout) console.error('STDOUT:', e.stdout);
    if (e && e.stderr) console.error('STDERR:', e.stderr);
    process.exit(2);
  }
})();