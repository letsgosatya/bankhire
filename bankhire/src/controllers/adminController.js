const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Earning = require('../models/Earning');

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getJobs = async (req, res) => {
  try {
    // Admin listing: also return newest jobs first
    const jobs = await Job.findAll({ order: [['createdAt', 'DESC']] });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

const getApplications = async (req, res) => {
  try {
    const applications = await Application.findAll();
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

const markApplicationJoined = async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findByPk(id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = 'JOINED';
    await application.save();

    // Check for referral and trigger reward
    const Referral = require('../models/Referral');
    const user = await User.findByPk(application.candidateId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const referral = await Referral.findOne({
      where: { candidateMobile: user.mobile, jobId: application.jobId },
    });
    if (referral) {
      referral.status = 'JOINED';
      await referral.save();
      // Determine reward based on job and referral config
      const ReferralRewardConfig = require('../models/ReferralRewardConfig');
      const job = await Job.findByPk(application.jobId);
      let reward = parseInt(process.env.REFERRAL_REWARD || '1000');
      if (job) {
        const cfg = await ReferralRewardConfig.findOne({ where: { bankName: job.bankName, jobRole: job.title } });
        if (cfg) reward = cfg.rewardAmount;
      }
      await Earning.create({ userId: referral.referrerId, amount: reward, type: 'REFERRAL', description: `Referral reward for job ${application.jobId}` });
    }

    res.json({ message: 'Application marked as joined' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application' });
  }
};

const { getReferrals: getReferralsSvc, refundReferralById, expireReferralById } = require('../services/referralAdminService');

const getReferrals = async (req, res) => {
  try {
    const where = {};
    if (req.query.status && req.query.status !== 'ALL') where.status = req.query.status;
    const page = parseInt(req.query.page || '1', 10) || 1;
    const size = Math.min(100, Math.max(1, parseInt(req.query.size || '20', 10)));
    const result = await getReferralsSvc({ where, page, size });
    // Items are already plain objects from service, no need to call toJSON
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

const getReferralDetails = async (req, res) => {
  try{
    const { id } = req.params;
    const result = await require('../services/referralAdminService').getReferralDetails(id);
    // convert rows to JSON
    result.referral = result.referral.toJSON();
    result.earnings = result.earnings.map(e => e.toJSON());
    result.relatedApplications = result.relatedApplications.map(a => a.toJSON());
    res.json(result);
  }catch(e){
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to fetch referral details' });
  }
};

const manualExpireReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await expireReferralById(id);
    res.json({ message: 'Referral expired', referral: r });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to expire referral' });
  }
};

const manualRefundReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await refundReferralById(id);
    res.json({ message: 'Referral refunded (marked NOT_ELIGIBLE) and reversal created', referral: result.referral, reversal: result.reversal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to refund referral' });
  }
};



const getExpiredReferrals = async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10) || 1;
    const size = Math.min(100, Math.max(1, parseInt(req.query.size || '20', 10)));
    const result = await getReferralsSvc({ where: { status: 'EXPIRED' }, page, size });
    // Items are already plain objects from service, no need to call toJSON
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expired referrals' });
  }
};

module.exports = { getUsers, getJobs, getApplications, markApplicationJoined, getReferrals, getReferralDetails, manualExpireReferral, manualRefundReferral, getExpiredReferrals };