const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReferralRewardConfig = sequelize.define('ReferralRewardConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bankName: { type: DataTypes.STRING, allowNull: false },
  jobRole: { type: DataTypes.STRING, allowNull: true },
  minExperience: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  rewardAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
}, {
  timestamps: false,
});

module.exports = ReferralRewardConfig;