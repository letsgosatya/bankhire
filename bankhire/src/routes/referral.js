const express = require('express');
const { createReferral, getMyReferrals, markReferralJoined, getMyEarnings, withdrawReferral, rejectReferral, getReferralById } = require('../controllers/referralController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Accept multipart/form-data with optional resume file. Role: EMPLOYEE
router.post('/create', authMiddleware, roleMiddleware(['EMPLOYEE']), upload.single('resume'), createReferral);
router.get('/my-referrals', authMiddleware, roleMiddleware(['EMPLOYEE']), getMyReferrals);
router.get('/my-earnings', authMiddleware, roleMiddleware(['EMPLOYEE']), getMyEarnings);
// Get referral by id (employee can view their own referral)
router.get('/:id', authMiddleware, roleMiddleware(['EMPLOYEE']), getReferralById);
router.post('/:id/mark-joined', authMiddleware, roleMiddleware(['ADMIN']), markReferralJoined);

// Withdraw a referral (employee who created it)
router.post('/withdraw', authMiddleware, roleMiddleware(['EMPLOYEE']), withdrawReferral);
// HR/Admin reject a referral
router.post('/reject', authMiddleware, roleMiddleware(['ADMIN','MANAGER']), rejectReferral);

module.exports = router;