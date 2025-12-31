const express = require('express');
const { getUsers, getJobs, getApplications, markApplicationJoined } = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/users', authMiddleware, roleMiddleware(['ADMIN']), getUsers);
router.get('/jobs', authMiddleware, roleMiddleware(['ADMIN']), getJobs);
router.get('/applications', authMiddleware, roleMiddleware(['ADMIN']), getApplications);

// Referrals management
router.get('/referrals', authMiddleware, roleMiddleware(['ADMIN']), require('../controllers/adminController').getReferrals);
router.post('/referral/:id/expire', authMiddleware, roleMiddleware(['ADMIN']), require('../controllers/adminController').manualExpireReferral);
router.post('/referral/:id/refund', authMiddleware, roleMiddleware(['ADMIN']), require('../controllers/adminController').manualRefundReferral);
router.get('/referral/:id', authMiddleware, roleMiddleware(['ADMIN']), require('../controllers/adminController').getReferralDetails);
router.post('/application/:id/joined', authMiddleware, roleMiddleware(['ADMIN']), markApplicationJoined);

// List expired referrals (ADMIN)
router.get('/referrals/expired', authMiddleware, roleMiddleware(['ADMIN']), require('../controllers/adminController').getExpiredReferrals);

module.exports = router;