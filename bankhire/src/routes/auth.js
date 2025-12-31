const express = require('express');
const { sendOtp, verifyOtp, uploadResume, downloadResume, upload } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/upload-resume', authMiddleware, upload.single('resume'), uploadResume);
router.get('/download-resume', authMiddleware, downloadResume);

module.exports = router;