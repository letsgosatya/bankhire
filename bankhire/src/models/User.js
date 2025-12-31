const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.ENUM('CANDIDATE', 'EMPLOYEE', 'MANAGER', 'ADMIN'),
    allowNull: false,
    defaultValue: 'CANDIDATE',
  },
  resumeUploaded: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  resumeFileReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  jobRole: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Bangalore',
  },
}, {
  timestamps: true,
});

module.exports = User;