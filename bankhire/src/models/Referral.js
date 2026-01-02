const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Referral = sequelize.define('Referral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  referrerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  candidateMobile: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Jobs',
      key: 'id',
    },
  },
  status: {
    // Expanded statuses to support withdraw/reject/expiry and NOT_ELIGIBLE
    type: DataTypes.ENUM('REFERRED', 'APPLIED', 'JOINED', 'WITHDRAWN', 'REJECTED', 'EXPIRED', 'NOT_ELIGIBLE'),
    allowNull: false,
    defaultValue: 'REFERRED',
  },
  rejectionReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rejectedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Optional candidate info & resume metadata (added for resume uploads during referral creation)
  candidateName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  candidateEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resumeFileReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resumeUploaded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Referral;