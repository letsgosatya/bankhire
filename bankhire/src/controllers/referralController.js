const Referral = require('../models/Referral');
const Earning = require('../models/Earning');
const User = require('../models/User');
const AppSetting = require('../models/AppSetting');
const ReferralRewardConfig = require('../models/ReferralRewardConfig');
const Job = require('../models/Job');

// Helper: get app settings (first row or defaults)
const getAppSettings = async () => {
  const s = await AppSetting.findOne();
  return s || { maxReferralsPerDay: 10, maxReferralsPerMonth: 100, defaultReferralExpiryDays: 30 };
};

const createReferral = async (req, res) => {
  const { candidateMobile, jobId } = req.body;
  if (!candidateMobile || !jobId) {
    return res.status(400).json({ error: 'Candidate mobile and job ID required' });
  }

  try {
    // Enforce referral limits
    const settings = await getAppSettings();
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const dayCount = await Referral.count({ where: { referrerId: req.user.id, createdAt: { [require('sequelize').Op.gte]: startOfDay } } });
    if (settings.maxReferralsPerDay && dayCount >= settings.maxReferralsPerDay) {
      return res.status(400).json({ error: `Daily referral limit reached (${settings.maxReferralsPerDay})` });
    }
    const monthCount = await Referral.count({ where: { referrerId: req.user.id, createdAt: { [require('sequelize').Op.gte]: startOfMonth } } });
    if (settings.maxReferralsPerMonth && monthCount >= settings.maxReferralsPerMonth) {
      return res.status(400).json({ error: `Monthly referral limit reached (${settings.maxReferralsPerMonth})` });
    }

    // Check for existing active referral for same candidate+job
    const { Op } = require('sequelize');
    const existingActive = await Referral.findOne({
      where: { candidateMobile, jobId, status: { [Op.in]: ['REFERRED','APPLIED'] } },
    });

    // calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (settings.defaultReferralExpiryDays || 30));

    const referral = await Referral.create({
      referrerId: req.user.id,
      candidateMobile,
      jobId,
      expiresAt,
    });

    if (existingActive) {
      referral.status = 'REJECTED';
      referral.rejectionReason = 'Already referred';
      referral.rejectedBy = 'SYSTEM';
      await referral.save();
      return res.status(201).json({ message: 'Referral auto-rejected (already referred)', referral });
    }

    res.status(201).json(referral);
  } catch (err) {
    console.error('Error creating referral:', err);
    res.status(500).json({ error: 'Failed to create referral' });
  }
};

const getMyReferrals = async (req, res) => {
  try {
    // expire old referrals if needed
    const now = new Date();
    const { Op } = require('sequelize');
    await Referral.update({ status: 'EXPIRED' }, { where: { status: { [Op.in]: ['REFERRED','APPLIED'] }, expiresAt: { [Op.lt]: now } } });

    const referrals = await Referral.findAll({
      where: { referrerId: req.user.id },
    });
    res.json(referrals);
  } catch (err) {
    console.error('Error fetching referrals:', err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};

const withdrawReferral = async (req, res) => {
  const { id } = req.body;
  try {
    const referral = await Referral.findByPk(id);
    if (!referral) return res.status(404).json({ error: 'Referral not found' });
    if (referral.referrerId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    referral.status = 'WITHDRAWN';
    await referral.save();
    res.json({ message: 'Referral withdrawn', referral });
  } catch (err) {
    console.error('Error withdrawing referral:', err);
    res.status(500).json({ error: 'Failed to withdraw referral' });
  }
};

const rejectReferral = async (req, res) => {
  const { id, reason } = req.body;
  try {
    const referral = await Referral.findByPk(id);
    if (!referral) return res.status(404).json({ error: 'Referral not found' });

    referral.status = 'REJECTED';
    referral.rejectionReason = reason || 'Rejected by HR';
    referral.rejectedBy = req.user.id || 'HR';
    await referral.save();

    res.json({ message: 'Referral rejected', referral });
  } catch (err) {
    console.error('Error rejecting referral:', err);
    res.status(500).json({ error: 'Failed to reject referral' });
  }
};

const markReferralJoined = async (req, res) => {
  const { id } = req.params;
  try {
    const referral = await Referral.findByPk(id);
    if (!referral) return res.status(404).json({ error: 'Referral not found' });

    referral.status = 'JOINED';
    await referral.save();

    // Determine reward dynamically from config
    const job = await Job.findByPk(referral.jobId);
    let reward = parseInt(process.env.REFERRAL_REWARD || '1000');
    if (job) {
      const cfg = await ReferralRewardConfig.findOne({ where: { bankName: job.bankName, jobRole: job.title } });
      if (cfg) reward = cfg.rewardAmount;
    }

    await Earning.create({ userId: referral.referrerId, amount: reward, type: 'REFERRAL', description: `Referral reward for job ${referral.jobId}` });

    res.json({ message: 'Referral marked as joined and earning created' });
  } catch (err) {
    console.error('Error marking referral joined:', err);
    res.status(500).json({ error: 'Failed to update referral' });
  }
};

const getMyEarnings = async (req, res) => {
  try {
    const earnings = await Earning.findAll({
      where: { userId: req.user.id },
    });
    res.json(earnings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

module.exports = { createReferral, getMyReferrals, withdrawReferral, rejectReferral, markReferralJoined, getMyEarnings };