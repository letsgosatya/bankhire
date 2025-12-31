require('dotenv').config();
const assert = require('assert');
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Referral = require('../src/models/Referral');
const Earning = require('../src/models/Earning');
const { expireReferralById, refundReferralById } = require('../src/services/referralAdminService');

(async ()=>{
  try{
    await sequelize.sync();

    const [user] = await User.findOrCreate({ where: { mobile: '9999933333' }, defaults: { role: 'EMPLOYEE' } });
    const [job] = await Job.findOrCreate({ where: { title: 'Service Test Job' }, defaults: { bankName: 'TEST', location:'Nowhere', description:'desc', createdBy: user.id } });

    const ref = await Referral.create({ candidateMobile: '0000000003', jobId: job.id, referrerId: user.id, status: 'REFERRED' });

    console.log('Expiring referral via service...');
    const expired = await expireReferralById(ref.id);
    assert.strictEqual(expired.status, 'EXPIRED');

    console.log('Creating another referral to test refund...');
    const ref2 = await Referral.create({ candidateMobile: '0000000004', jobId: job.id, referrerId: user.id, status: 'REFERRED' });

    const result = await refundReferralById(ref2.id);
    assert.strictEqual(result.referral.status, 'NOT_ELIGIBLE');
    const reversal = await Earning.findOne({ where: { userId: user.id, type: 'REFERRAL_REVERSAL' } });
    assert.ok(reversal, 'Reversal earning should exist');

    console.log('All service tests passed');
    process.exit(0);
  }catch(e){
    console.error('Test failed', e);
    process.exit(1);
  }
})();