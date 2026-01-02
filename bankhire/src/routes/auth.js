const express = require('express');
const { sendOtp, verifyOtp, uploadResume, downloadResume, upload, getProfile, updateProfile } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/upload-resume', authMiddleware, upload.single('resume'), uploadResume);
router.get('/download-resume', authMiddleware, downloadResume);
router.get('/me', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;