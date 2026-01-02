const { parseResume } = require('../src/utils/resumeParser');
const path = require('path');

(async ()=>{
  try{
    const p = path.join(__dirname, 'sample_resume.txt');
    const out = await parseResume(p);
    console.log('Parsed:', out);
    process.exit(0);
  }catch(e){
    console.error('Failed', e);
    process.exit(1);
  }
})();