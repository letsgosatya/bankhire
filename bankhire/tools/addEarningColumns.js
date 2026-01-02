require('dotenv').config();
const { sequelize } = require('../src/config/database');

(async ()=>{
  try{
    const qi = sequelize.getQueryInterface();
    const table = 'Earnings';
    const cols = await qi.describeTable(table);
    if(!cols.type){
      console.log('Adding column type to Earnings');
      await qi.addColumn(table, 'type', { type: require('sequelize').DataTypes.STRING, allowNull: false, defaultValue: 'REFERRAL' });
    } else console.log('Column type exists');
    if(!cols.description){
      console.log('Adding column description to Earnings');
      await qi.addColumn(table, 'description', { type: require('sequelize').DataTypes.TEXT, allowNull: true });
    } else console.log('Column description exists');
    console.log('Done');
    process.exit(0);
  }catch(e){
    console.error('Failed to add columns', e);
    process.exit(2);
  }
})();