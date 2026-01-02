const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../services/otpService');
const { generateToken } = require('../utils/jwtUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  console.log('Send OTP request received for mobile:', mobile);
  if (!mobile) return res.status(400).json({ error: 'Mobile number required' });

  try {
    console.log('Calling sendOTP service...');
    await sendOTP(mobile);
    console.log('sendOTP service completed successfully');
    console.log('Sending success response');
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.log('Error in sendOTP controller:', err.message);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;
  console.log('Verify OTP request received for mobile:', mobile, 'OTP:', otp);
  if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required' });

  try {
    const isValid = await verifyOTP(mobile, otp);
    console.log('OTP verification result:', isValid);
    if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

    console.log('Finding or creating user for mobile:', mobile);
    let user = await User.findOne({ where: { mobile } });
    console.log('User found:', user ? user.id : 'not found');
    if (!user) {
      console.log('Creating new user');
      user = await User.create({ mobile, role: 'CANDIDATE' });
      console.log('User created:', user.id);
    }

    console.log('Generating token for user:', user.id);
    const token = generateToken(user);
    console.log('Token generated, sending response');
    res.json({ token, user: { id: user.id, mobile: user.mobile, role: user.role, resumeUploaded: user.resumeUploaded } });
  } catch (err) {
    console.log('Error in verifyOtp:', err && err.stack ? err.stack : err);
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
    user.resumeFileReference = req.file.path;
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

    const filePath = path.join(__dirname, '..', '..', user.resumeFileReference);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const fileName = path.basename(user.resumeFileReference);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath);
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