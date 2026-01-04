const axios = require('axios');
(async ()=>{
  try{
    const res = await axios.get('http://localhost:3002/jobs');
    console.log('status', res.status, 'data length:', Array.isArray(res.data)?res.data.length:Object.keys(res.data).length);
  }catch(e){
    if(e.response){
      console.error('status', e.response.status, 'data:', e.response.data);
    } else {
      console.error('error', e.message, e.stack);
    }
  }
})();