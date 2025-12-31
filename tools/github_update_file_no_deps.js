const fs = require('fs');
const https = require('https');

const OWNER = 'letsgosatya';
const REPO = 'bankhire';
const FILE_PATH = '.github/workflows/referral-e2e.yml';
const BRANCH = 'main';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Missing GH token. Set GH_TOKEN env var.');
  process.exit(2);
}

function request(method, path, data) {
  const opts = {
    hostname: 'api.github.com',
    path,
    method,
    headers: {
      'Authorization': `token ${TOKEN}`,
      'User-Agent': 'bankhire-ci-agent',
      'Accept': 'application/vnd.github.v3+json'
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          const json = buf ? JSON.parse(buf) : null;
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, body: json });
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async ()=>{
  try {
    const path = `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const info = await request('GET', path + `?ref=${BRANCH}`);
    const sha = info.sha;
    const contentRaw = fs.readFileSync(FILE_PATH, 'utf8');
    const contentB64 = Buffer.from(contentRaw, 'utf8').toString('base64');

    const payload = {
      message: 'ci: add manual workflow_dispatch and include seed_verify artifact',
      content: contentB64,
      sha,
      branch: BRANCH
    };

    const res = await request('PUT', path, payload);
    console.log('Update successful. Commit SHA:', res.commit && res.commit.sha);
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
})();