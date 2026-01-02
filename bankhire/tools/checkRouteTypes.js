console.log('auth:', typeof require('../src/middlewares/authMiddleware'));
console.log('role:', typeof require('../src/middlewares/roleMiddleware')(['ADMIN']))
console.log('getReferrals:', typeof require('../src/controllers/adminController').getReferrals)
console.log('manualExpire:', typeof require('../src/controllers/adminController').manualExpireReferral)
console.log('getExpiredReferrals:', typeof require('../src/controllers/adminController').getExpiredReferrals)
console.log('getReferralDetails:', typeof require('../src/controllers/adminController').getReferralDetails)
