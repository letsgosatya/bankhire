require('dotenv').config();
const { sequelize } = require('../src/config/database');

(async ()=>{
  try{
    const qi = sequelize.getQueryInterface();
    const table = 'Earnings';
    const cols = await qi.describeTable(table);
    if(!cols.referralId){
      console.log('Adding column referralId to Earnings');
      await qi.addColumn(table, 'referralId', { type: require('sequelize').DataTypes.INTEGER, allowNull: true, references: { model: 'Referrals', key: 'id' } });
    } else console.log('Column referralId exists');
    console.log('Done');
    process.exit(0);
  }catch(e){
    console.error('Failed to add referralId column', e);
    process.exit(2);
  }
})();