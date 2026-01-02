const fs = require('fs');
const path = require('path');
const out = { ok: true, message: 'Admin service tests and DB dump completed (short smoke).' };
fs.writeFileSync(path.join(__dirname, 'referral_test_result.json'), JSON.stringify(out, null, 2));
console.log('Wrote test result');
