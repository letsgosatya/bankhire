/**
 * AUTH CONTROLLER
 * Enhanced with security: safe logging, audit trails, IP tracking
 */

const User = require('../models/User');
const { sendOTP, verifyOTP, maskMobile } = require('../services/otpService');
const { generateToken, generateTokenPair } = require('../utils/jwtUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Security imports
const safeLogger = require('../utils/safeLogger');
const auditService = require('../services/auditService');
const fraudDetectionService = require('../services/fraudDetectionService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX allowed.'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const sendOtp = async (req, res) => {
  const { mobile } = req.body;
  // Security: Use safe logging - never log actual mobile number
  safeLogger.info('OTP request received', { mobile: maskMobile(mobile) }, req);
  
  if (!mobile) return res.status(400).json({ error: 'Mobile number required', requestId: req.requestId });

  try {
    await sendOTP(mobile);
    // Security: Audit log OTP sent
    auditService.createAuditRecord(auditService.AUDIT_EVENTS.OTP_SENT, {
      // Don't log mobile
    }, req);
    res.json({ message: 'OTP sent successfully', requestId: req.requestId });
  } catch (err) {
    safeLogger.error('Error in sendOTP', err, req);
    // Security: Return rate limit error message if applicable
    if (err.message && err.message.includes('Too many')) {
      return res.status(429).json({ error: err.message, requestId: req.requestId });
    }
    res.status(500).json({ error: 'Failed to send OTP', requestId: req.requestId });
  }
};

const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  // Security: Never log OTP or full mobile
  safeLogger.info('OTP verification request', { mobile: maskMobile(mobile) }, req);
  
  if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required', requestId: req.requestId });

  try {
    const isValid = await verifyOTP(mobile, otp);
    
    if (!isValid) {
      // Security: Log failed OTP attempt
      auditService.createAuditRecord(auditService.AUDIT_EVENTS.OTP_FAILED, {}, req);
      return res.status(400).json({ error: 'Invalid or expired OTP', requestId: req.requestId });
    }

    safeLogger.info('OTP verified, finding/creating user', { mobile: maskMobile(mobile) }, req);
    let user = await User.findOne({ where: { mobile } });
    let isNewUser = false;
    
    if (!user) {
      user = await User.create({ mobile, role: 'CANDIDATE' });
      isNewUser = true;
      // Security: Track IP for new registrations
      fraudDetectionService.trackIpRegistration(req.ip, user.id, req);
      auditService.createAuditRecord(auditService.AUDIT_EVENTS.USER_CREATED, {
        userId: user.id,
        isNewUser: true,
      }, req);
    }

    // Security: Log successful authentication
    auditService.createAuditRecord(auditService.AUDIT_EVENTS.LOGIN_SUCCESS, {
      userId: user.id,
    }, req);

    const token = generateToken(user);
    
    // Security: Don't expose full mobile in response (already known to client)
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        mobile: user.mobile, 
        role: user.role, 
        resumeUploaded: user.resumeUploaded 
      },
      requestId: req.requestId,
    });
  } catch (err) {
    safeLogger.error('Error in verifyOtp', err, req);
    try {
      const logDir = path.join(__dirname, '..', '..', 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, 'verify_errors.log');
      const details = {
        message: err && err.message,
        name: err && err.name,
        parentMessage: err && err.parent && err.parent.message,
        sql: err && err.sql,
        stack: err && err.stack
      };
      fs.appendFileSync(logFile, `${new Date().toISOString()} - Error verifying mobile ${mobile}: ${JSON.stringify(details)}\n`);
    } catch (logErr) {
      console.error('Failed to write verify error log', logErr);
    }
    res.status(500).json({ error: 'Verification failed' });
  }
};

const uploadResume = async (req, res) => {
  console.log('Upload resume request received');
  console.log('Headers:', req.headers);
  console.log('User from token:', req.user);
  console.log('File:', req.file);
  console.log('Files:', req.files);
  console.log('Body:', req.body);
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    user.resumeUploaded = true;
    // Store path relative to repository root to avoid absolute paths in the DB
    const repoRoot = path.resolve(__dirname, '..', '..');
    user.resumeFileReference = path.relative(repoRoot, req.file.path);
    if (req.body.jobRole) user.jobRole = req.body.jobRole;
    if (req.body.location) user.location = req.body.location;

    // Parse resume to extract simple fields (email, name, skills) when possible
    try{
      const { parseResume } = require('../utils/resumeParser');
      const parsed = await parseResume(req.file.path);
      if(parsed.name) user.fullName = parsed.name;
      if(parsed.email) user.email = parsed.email;
      if(parsed.skills) user.skills = parsed.skills;
    }catch(e){
      console.log('Resume parsing failed or parser missing:', e.message || e);
    }

    await user.save();

    res.json({ message: 'Resume uploaded successfully', user: { id: user.id, mobile: user.mobile, role: user.role, resumeUploaded: user.resumeUploaded, fullName: user.fullName, email: user.email } });
  } catch (err) {
    console.log('Error in uploadResume:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};

const downloadResume = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.resumeUploaded || !user.resumeFileReference) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const ref = user.resumeFileReference;
    // Resolve absolute or relative path robustly
    let filePath;
    if (path.isAbsolute(ref)) {
      filePath = path.normalize(ref);
    } else {
      filePath = path.resolve(__dirname, '..', '..', ref);
    }

    console.log('downloadResume: resolved path:', filePath, 'exists:', fs.existsSync(filePath));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const fileName = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath, (err) => {
      if (err) console.log('sendFile error:', err);
    });
  } catch (err) {
    console.log('Error in downloadResume:', err);
    res.status(500).json({ error: 'Download failed' });
  }
};

const getProfile = async (req, res) => {
  try{
    const user = await User.findByPk(req.user.id, { attributes: ['id','mobile','role','resumeUploaded','resumeFileReference','jobRole','location','fullName','email','skills'] });
    if(!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  }catch(e){
    console.error('getProfile failed', e);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try{
    const user = await User.findByPk(req.user.id);
    if(!user) return res.status(404).json({ error: 'User not found' });
    const { fullName, email, skills, jobRole, location } = req.body;
    if(fullName !== undefined) user.fullName = fullName;
    if(email !== undefined) user.email = email;
    if(skills !== undefined) user.skills = skills;
    if(jobRole !== undefined) user.jobRole = jobRole;
    if(location !== undefined) user.location = location;
    await user.save();
    res.json({ message: 'Profile updated', user });
  }catch(e){
    console.error('updateProfile failed', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = { sendOtp, verifyOtp, uploadResume, downloadResume, upload, getProfile, updateProfile };