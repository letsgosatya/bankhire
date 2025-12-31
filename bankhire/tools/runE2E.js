const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TEST_OUT = path.join(__dirname, 'referral_test_result.json');
const DB_DUMP = path.join(__dirname, 'referral_db_dump.json');

function run(cmd, opts = {}){
  return new Promise((resolve, reject) => {
    const p = exec(cmd, { ...opts, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  });
}

async function waitForHealth(url = 'http://127.0.0.1:3002/health', attempts = 30, delay = 1000){
  for(let i=0;i<attempts;i++){
    try{ const r = await axios.get(url, { timeout: 2000 }); if (r.status === 200) return true; }catch(e){}
    await new Promise(r=>setTimeout(r, delay));
  }
  return false;
}

(async ()=>{
  try{
    // 1) Run seed, to ensure DB seeded
    console.log('Running seed...');
    await run('node seed.js');

    // 2) Start server in background
    console.log('Starting server in background...');
    const server = exec('node src/app.js', { maxBuffer: 1024 * 1024 * 10 });
    server.stdout.pipe(process.stdout);
    server.stderr.pipe(process.stderr);

    // 3) Wait for health
    console.log('Waiting for server health...');
    const ok = await waitForHealth();
    if(!ok){ throw new Error('Server health check failed'); }

    // 4) Run e2e test script
    console.log('Running E2E test script...');
    await run('node tools/testReferralFlows.js');

    // 5) Dump DB
    console.log('Dumping referral DB...');
    await run('node tools/dumpReferralJson.js');

    // 6) Read test output
    if (!fs.existsSync(TEST_OUT)){
      console.error('Test output not found:', TEST_OUT);
      process.exit(2);
    }
    const out = JSON.parse(fs.readFileSync(TEST_OUT, 'utf8'));
    console.log('Test result:', JSON.stringify(out, null, 2));

    // determine success
    if (out.ok){
      console.log('E2E test OK');
      process.exit(0);
    } else {
      console.error('E2E test failed:', out.error || out.steps);
      process.exit(3);
    }
  }catch(e){
    console.error('E2E runner error:', e && e.err ? e.err : e);
    process.exit(1);
  }
})();