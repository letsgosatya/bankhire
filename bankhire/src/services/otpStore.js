const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'otp_store.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf8');
}

function readStore() {
  try {
    ensureDataDir();
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeStore(store) {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write OTP store', e);
    return false;
  }
}

async function setOtp(mobile, hashedOtp, expiry) {
  const store = readStore();
  store[mobile] = { hashedOtp, expiry, usedAt: store[mobile]?.usedAt || null };
  writeStore(store);
}

async function getOtp(mobile) {
  const store = readStore();
  return store[mobile] || null;
}

async function deleteOtp(mobile) {
  const store = readStore();
  if (store[mobile]) {
    delete store[mobile];
    writeStore(store);
  }
}

async function markUsed(mobile) {
  const store = readStore();
  if (store[mobile]) {
    store[mobile].usedAt = Date.now();
    writeStore(store);
  }
}

module.exports = { setOtp, getOtp, deleteOtp, markUsed };
