const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Earning = sequelize.define('Earning', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
}, {
  timestamps: true,
});

module.exports = Earning;