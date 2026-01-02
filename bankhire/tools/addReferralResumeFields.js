require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { DataTypes } = require('sequelize');

(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const table = 'Referrals';
    const cols = await qi.describeTable(table);
    
    if (!cols.candidateName) {
      console.log('Adding column candidateName to Referrals');
      await qi.addColumn(table, 'candidateName', { type: DataTypes.STRING, allowNull: true });
    } else {
      console.log('candidateName exists');
    }
    
    if (!cols.candidateEmail) {
      console.log('Adding column candidateEmail to Referrals');
      await qi.addColumn(table, 'candidateEmail', { type: DataTypes.STRING, allowNull: true });
    } else {
      console.log('candidateEmail exists');
    }
    
    if (!cols.resumeFileReference) {
      console.log('Adding column resumeFileReference to Referrals');
      await qi.addColumn(table, 'resumeFileReference', { type: DataTypes.STRING, allowNull: true });
    } else {
      console.log('resumeFileReference exists');
    }
    
    if (!cols.resumeUploaded) {
      console.log('Adding column resumeUploaded to Referrals');
      await qi.addColumn(table, 'resumeUploaded', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    } else {
      console.log('resumeUploaded exists');
    }
    
    console.log('Done - Referral resume fields migration complete');
    process.exit(0);
  } catch (e) {
    console.error('Failed to add referral resume fields:', e);
    process.exit(2);
  }
})();
