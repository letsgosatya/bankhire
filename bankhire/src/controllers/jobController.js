const Job = require('../models/Job');
const Application = require('../models/Application');

const createJob = async (req, res) => {
  const { title, bankName, location, description } = req.body;
  if (!title || !bankName || !location || !description) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const job = await Job.create({
      title,
      bankName,
      location,
      description,
      createdBy: req.user.id,
    });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job' });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

const applyForJob = async (req, res) => {
  const { id } = req.params;
  console.log('=== BACKEND: applyForJob called ===');
  console.log('Job ID:', id);
  console.log('User ID:', req.user?.id);
  console.log('User role:', req.user?.role);
  
  try {
    const job = await Job.findByPk(id);
    console.log('Job found:', job ? 'YES' : 'NO');
    if (!job) {
      console.log('Job not found, returning 404');
      return res.status(404).json({ error: 'Job not found' });
    }

    const existing = await Application.findOne({
      where: { jobId: id, candidateId: req.user.id },
    });
    console.log('Existing application:', existing ? 'YES' : 'NO');
    if (existing) {
      console.log('Already applied, returning 400');
      return res.status(400).json({ error: 'Already applied' });
    }

    console.log('Creating new application...');
    const application = await Application.create({
      jobId: id,
      candidateId: req.user.id,
    });
    console.log('Application created:', application.id);
    res.status(201).json(application);
  } catch (err) {
    console.log('Error in applyForJob:', err);
    res.status(500).json({ error: 'Failed to apply' });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { candidateId: req.user.id },
      include: [{ model: Job, as: 'job' }],
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const application = await Application.findOne({
      where: { id, candidateId: req.user.id },
      include: [{ model: Job, as: 'job' }],
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    application.status = status;
    await application.save();
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
};

const getApplication = async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findOne({
      where: { id, candidateId: req.user.id },
      include: [{ model: Job, as: 'job' }],
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

module.exports = { createJob, getJobs, applyForJob, getMyApplications, updateApplicationStatus, getApplication };