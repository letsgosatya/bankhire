const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppSetting = sequelize.define('AppSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  maxReferralsPerDay: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxReferralsPerMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  defaultReferralExpiryDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
  },
}, {
  timestamps: false,
});

module.exports = AppSetting;