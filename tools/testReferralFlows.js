const axios = require('axios');
const fs = require('fs');

const API = 'http://127.0.0.1:3002';
const OUT = 'C:/Satya_RealtimeProjects/BankHire/tools/referral_test_result.json';

const pause = ms => new Promise(r => setTimeout(r, ms));

async function verifyOtp(mobile) {
  await axios.post(`${API}/auth/send-otp`, { mobile });
  const res = await axios.post(`${API}/auth/verify-otp`, { mobile, otp: '123456' });
  return res.data;
}

async function writeResult(obj){
  try{ fs.writeFileSync(OUT, JSON.stringify(obj, null, 2)); } catch(e){ console.error('Failed to write result file', e.message); }
}

async function run() {
  const result = { steps: [], ok: false };
  try {
    result.steps.push({ step: 'start', ts: new Date().toISOString() });

    result.steps.push({ step: 'verify_otp', detail: 'Verifying employee OTP' });
    const v = await verifyOtp('7777000001');
    result.steps.push({ step: 'verify_otp_response', detail: !!v.token });
    const token = v.token;

    const client = axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } });

    result.steps.push({ step: 'create_referral', detail: 'Creating referral for job 1 -> candidate 1111111111' });
    const createRes = await client.post('/referral/create', { candidateMobile: '1111111111', jobId: 1 });
    result.steps.push({ step: 'create_referral_response', detail: createRes.data });

    result.steps.push({ step: 'fetch_my_referrals', detail: 'Fetching my referrals' });
    const list = await client.get('/referral/my-referrals');
    result.steps.push({ step: 'my_referrals_count', detail: list.data.length });
    const created = list.data.find(r => r.candidateMobile === '1111111111');
    if (!created) {
      result.error = 'Created referral not found in list';
      await writeResult(result);
      return;
    }

    result.steps.push({ step: 'withdraw', detail: `Attempting withdraw of referral id ${created.id}` });
    const w = await client.post('/referral/withdraw', { id: created.id });
    result.steps.push({ step: 'withdraw_response', detail: w.data });

    result.ok = true;
    result.steps.push({ step: 'done', ts: new Date().toISOString() });
    await writeResult(result);
  } catch (err) {
    result.error = err.response ? err.response.data : err.message;
    await writeResult(result);
    console.error('Test error:', result.error);
  }
}

run();