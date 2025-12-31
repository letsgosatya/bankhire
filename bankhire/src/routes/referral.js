const express = require('express');
const { createReferral, getMyReferrals, markReferralJoined, getMyEarnings, withdrawReferral, rejectReferral } = require('../controllers/referralController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware(['EMPLOYEE']), createReferral);
router.get('/my-referrals', authMiddleware, roleMiddleware(['EMPLOYEE']), getMyReferrals);
router.get('/my-earnings', authMiddleware, roleMiddleware(['EMPLOYEE']), getMyEarnings);
router.post('/:id/mark-joined', authMiddleware, roleMiddleware(['ADMIN']), markReferralJoined);

// Withdraw a referral (employee who created it)
router.post('/withdraw', authMiddleware, roleMiddleware(['EMPLOYEE']), withdrawReferral);
// HR/Admin reject a referral
router.post('/reject', authMiddleware, roleMiddleware(['ADMIN','MANAGER']), rejectReferral);

module.exports = router;