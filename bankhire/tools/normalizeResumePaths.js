const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../src/models/User');
(async ()=>{
  try{
    const users = await User.findAll({ where: { resumeFileReference: { [require('sequelize').Op.ne]: null } } });
    const repoRoot = path.resolve(__dirname, '..');
    let changed = 0;
    for(const u of users){
      const ref = u.resumeFileReference;
      if(!ref) continue;
      if(path.isAbsolute(ref)){
        const rel = path.relative(repoRoot, ref);
        u.resumeFileReference = rel;
        await u.save();
        changed++;
        console.log('Updated user', u.id, 'to', rel);
      }
    }
    console.log('Done. Updated', changed, 'users');
    process.exit(0);
  }catch(e){
    console.error('Error normalizing resume paths', e);
    process.exit(1);
  }
})();