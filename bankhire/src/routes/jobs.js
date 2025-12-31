const express = require('express');
const { createJob, getJobs, applyForJob, getMyApplications, updateApplicationStatus, getApplication } = require('../controllers/jobController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware(['MANAGER']), createJob);
router.get('/', authMiddleware, getJobs);
router.post('/:id/apply', authMiddleware, roleMiddleware(['CANDIDATE']), applyForJob);
router.get('/my', authMiddleware, roleMiddleware(['CANDIDATE']), getMyApplications);
router.get('/application/:id', authMiddleware, roleMiddleware(['CANDIDATE']), getApplication);
router.put('/application/:id/status', authMiddleware, roleMiddleware(['CANDIDATE']), updateApplicationStatus);

module.exports = router;