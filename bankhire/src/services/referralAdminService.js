const Referral = require('../models/Referral');
const Job = require('../models/Job');
const ReferralRewardConfig = require('../models/ReferralRewardConfig');
const Earning = require('../models/Earning');

async function getReferrals({ where = {}, page = 1, size = 20 } = {}){
  const offset = (Math.max(1, page) - 1) * size;
  const { count, rows } = await Referral.findAndCountAll({ where, limit: size, offset, order: [['createdAt','DESC']] });
  return { items: rows, total: count, page: Math.max(1, page), size };
}

async function getReferralDetails(id){
  const r = await Referral.findByPk(id);
  if(!r) throw new Error('Referral not found');
  const Earning = require('../models/Earning');
  const Application = require('../models/Application');
  const earnings = await Earning.findAll({ where: { userId: r.referrerId, type: ['REFERRAL','REFERRAL_REVERSAL'] } });
  const applications = await Application.findAll({ where: { jobId: r.jobId } });
  return { referral: r, earnings, relatedApplications: applications };
}

async function expireReferralById(id){
  const r = await Referral.findByPk(id);
  if(!r) throw new Error('Referral not found');
  r.status = 'EXPIRED';
  await r.save();
  return r;
}

async function refundReferralById(id){
  const r = await Referral.findByPk(id);
  if(!r) throw new Error('Referral not found');

  r.status = 'NOT_ELIGIBLE';
  await r.save();

  // compute reward
  let reward = parseInt(process.env.REFERRAL_REWARD || '1000');
  const job = await Job.findByPk(r.jobId);
  if (job){
    const cfg = await ReferralRewardConfig.findOne({ where: { bankName: job.bankName, jobRole: job.title } });
    if (cfg) reward = cfg.rewardAmount;
  }

  const reversal = await Earning.create({ userId: r.referrerId, amount: -Math.abs(reward), type: 'REFERRAL_REVERSAL', description: `Reversal for referral ${r.id}` });
  return { referral: r, reversal };
}

module.exports = { getReferrals, expireReferralById, refundReferralById };
