require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const referralRoutes = require('./routes/referral');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.get('/', (req, res) => res.json({ message: 'BankHire API is running', health: '/health', docs: 'Check README for API endpoints' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Define associations
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const Referral = require('./models/Referral');
const Earning = require('./models/Earning');

User.hasMany(Job, { foreignKey: 'createdBy' });
Job.belongsTo(User, { foreignKey: 'createdBy' });

User.hasMany(Application, { foreignKey: 'candidateId' });
Application.belongsTo(User, { foreignKey: 'candidateId' });

Job.hasMany(Application, { foreignKey: 'jobId' });
Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

User.hasMany(Referral, { foreignKey: 'referrerId' });
Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });

Job.hasMany(Referral, { foreignKey: 'jobId' });
Referral.belongsTo(Job, { foreignKey: 'jobId' });

User.hasMany(Earning, { foreignKey: 'userId' });
Earning.belongsTo(User, { foreignKey: 'userId' });

app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/referral', referralRoutes);
app.use('/admin', adminRoutes);

// Global error handler
app.use(errorHandler);

// Sync database and start server
sequelize.sync().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Start scheduled background jobs (referral expiry)
  try{
    const { start: startReferralExpiry } = require('./services/referralExpiryService');
    startReferralExpiry();
  }catch(e){
    console.error('Failed to start background jobs:', e);
  }
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});