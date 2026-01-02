require('dotenv').config();
const { sequelize } = require('../src/config/database');

(async ()=>{
  try{
    const qi = sequelize.getQueryInterface();
    const table = 'Referrals';
    const cols = await qi.describeTable(table);
    if(!cols.candidateName){
      console.log('Adding column candidateName to Referrals');
      await qi.addColumn(table, 'candidateName', { type: require('sequelize').DataTypes.STRING, allowNull: true });
    } else console.log('candidateName exists');
    if(!cols.candidateEmail){
      console.log('Adding column candidateEmail to Referrals');
      await qi.addColumn(table, 'candidateEmail', { type: require('sequelize').DataTypes.STRING, allowNull: true });
    } else console.log('candidateEmail exists');
    if(!cols.resumeFileReference){
      console.log('Adding column resumeFileReference to Referrals');
      await qi.addColumn(table, 'resumeFileReference', { type: require('sequelize').DataTypes.STRING, allowNull: true });
    } else console.log('resumeFileReference exists');
    if(!cols.resumeUploaded){
      console.log('Adding column resumeUploaded to Referrals');
      await qi.addColumn(table, 'resumeUploaded', { type: require('sequelize').DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    } else console.log('resumeUploaded exists');
    console.log('Done');
    process.exit(0);
  }catch(e){
    console.error('Failed to add referral fields', e);
    process.exit(2);
  }
})();