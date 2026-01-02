const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Jobs',
      key: 'id',
    },
  },
  candidateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPLIED', 'CONFIRMED', 'REJECTED', 'INTERVIEW', 'SELECTED', 'JOINED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
}, {
  timestamps: true,
});

module.exports = Application;