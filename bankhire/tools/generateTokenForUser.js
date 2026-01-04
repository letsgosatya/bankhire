const { generateToken } = require('../src/utils/jwtUtils');
const User = require('../src/models/User');
(async ()=>{
  try{
    const user = await User.findOne({ where: { resumeUploaded: true } });
    if(!user){ console.error('No user with resumeUploaded found'); process.exit(1); }
    const token = generateToken(user);
    console.log('User id:', user.id, 'mobile:', user.mobile);
    console.log('Token:', token);
  }catch(e){ console.error('Error generating token', e); process.exit(1); }
})();