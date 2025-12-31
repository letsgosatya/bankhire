const fs = require('fs');
const axios = require('axios');

const OWNER = 'letsgosatya';
const REPO = 'bankhire';
const FILE_PATH = '.github/workflows/referral-e2e.yml';
const BRANCH = 'main';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('Missing GH token. Set GH_TOKEN env var.');
  process.exit(2);
}

(async ()=>{
  try {
    const contentRaw = fs.readFileSync(FILE_PATH, 'utf8');
    const contentB64 = Buffer.from(contentRaw, 'utf8').toString('base64');

    // get current file sha
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
    const headers = {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'bankhire-ci-agent'
    };

    const getRes = await axios.get(url, { headers, params: { ref: BRANCH } });
    const sha = getRes.data.sha;

    const putRes = await axios.put(url, {
      message: 'ci: add manual workflow_dispatch and include seed_verify artifact',
      content: contentB64,
      sha,
      branch: BRANCH
    }, { headers });

    console.log('Update successful. Commit SHA:', putRes.data.commit && putRes.data.commit.sha);
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err.response ? err.response.data : err.message);
    process.exit(3);
  }
})();