require('dotenv').config();
const { sequelize } = require('../src/config/database');

(async ()=>{
  try{
    const qi = sequelize.getQueryInterface();
    const table = 'Users';
    const cols = await qi.describeTable(table);
    if(!cols.fullName){
      console.log('Adding column fullName to Users');
      await qi.addColumn(table, 'fullName', { type: require('sequelize').DataTypes.STRING, allowNull: true });
    } else console.log('fullName exists');
    if(!cols.email){
      console.log('Adding column email to Users');
      await qi.addColumn(table, 'email', { type: require('sequelize').DataTypes.STRING, allowNull: true });
    } else console.log('email exists');
    if(!cols.skills){
      console.log('Adding column skills to Users');
      await qi.addColumn(table, 'skills', { type: require('sequelize').DataTypes.TEXT, allowNull: true });
    } else console.log('skills exists');
    console.log('Done');
    process.exit(0);
  }catch(e){
    console.error('Failed to add user resume fields', e);
    process.exit(2);
  }
})();