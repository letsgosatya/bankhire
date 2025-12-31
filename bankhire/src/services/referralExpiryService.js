const { Op } = require('sequelize');
const Referral = require('../models/Referral');

async function expireReferrals(now = new Date()){
  const sequelize = Referral.sequelize;
  const t = await sequelize.transaction();
  try{
    const toExpire = await Referral.findAll({
      where: { status: { [Op.in]: ['REFERRED','APPLIED'] }, expiresAt: { [Op.lt]: now } },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (toExpire.length === 0) {
      await t.commit();
      return { count: 0 };
    }

    for(const r of toExpire){
      r.status = 'EXPIRED';
      await r.save({ transaction: t });
      console.log(`Referral ${r.id} expired (referrer ${r.referrerId})`);
    }

    await t.commit();
    return { count: toExpire.length, ids: toExpire.map(r=>r.id) };
  }catch(e){
    await t.rollback();
    throw e;
  }
}

let intervalId = null;
function start(intervalMs = process.env.REFERRAL_EXPIRY_CHECK_INTERVAL_MS ? parseInt(process.env.REFERRAL_EXPIRY_CHECK_INTERVAL_MS, 10) : 60 * 1000){
  if (intervalId) return;
  console.log('Starting referral expiry job, intervalMs=', intervalMs);
  intervalId = setInterval(()=>{
    expireReferrals().catch(err => console.error('Expiry job error:', err));
  }, intervalMs);
}

function stop(){
  if (intervalId){ clearInterval(intervalId); intervalId = null; }
}

module.exports = { expireReferrals, start, stop };
