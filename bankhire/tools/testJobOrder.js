require('dotenv').config();
const { sequelize } = require('../src/config/database');
const Job = require('../src/models/Job');

(async ()=>{
  try{
    await sequelize.sync();

    console.log('Creating job A...');
    const a = await Job.create({ title: 'Job A - older', bankName: 'TEST', location: 'X', description: 'older job', createdBy: 1 });
    // small delay
    await new Promise(r=>setTimeout(r, 1000));
    console.log('Creating job B...');
    const b = await Job.create({ title: 'Job B - newer', bankName: 'TEST', location: 'Y', description: 'newer job', createdBy: 1 });

    const jobs = await Job.findAll({ order: [['createdAt','DESC']] });
    console.log('First job title:', jobs[0].title);
    if (jobs[0].id === b.id) {
      console.log('SUCCESS: New job appears first');
      process.exit(0);
    } else {
      console.error('FAIL: New job is not first');
      process.exit(2);
    }
  }catch(e){
    console.error('Test failed', e);
    process.exit(1);
  }
})();