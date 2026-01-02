const fs = require('fs');
const path = require('path');

async function parseTextFromFile(filePath){
  const ext = path.extname(filePath).toLowerCase();
  // try PDF via pdf-parse if available
  if(ext === '.pdf'){
    try{
      const pdf = require('pdf-parse');
      const data = fs.readFileSync(filePath);
      const res = await pdf(data);
      return res.text || '';
    }catch(e){
      // pdf-parse not available or failed
    }
  }
  // try docx via mammoth if available
  if(ext === '.docx'){
    try{
      const mammoth = require('mammoth');
      const res = await mammoth.extractRawText({ path: filePath });
      return (res && res.value) ? res.value : '';
    }catch(e){
      // mammoth not available or failed
    }
  }
  // fallback: treat as text and read
  try{
    return fs.readFileSync(filePath, 'utf8');
  }catch(e){
    return '';
  }
}

function extractEmail(text){
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : null;
}

function extractPhone(text){
  // look for 10+ digit sequences
  const m = text.match(/\+?\d[\d \-().]{8,}\d/);
  return m ? m[0].replace(/[ \-().]/g,'') : null;
}

function extractName(text){
  // naive: pick the first non-empty line with 2-4 words and capitalization
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for(let i=0;i<Math.min(8,lines.length);i++){
    const line = lines[i];
    const words = line.split(/\s+/);
    if(words.length>=2 && words.length<=4 && /^[A-Z][a-z]/.test(words[0])){
      return line.replace(/[^A-Za-z \-]/g,'').trim();
    }
  }
  return null;
}

function extractSkills(text){
  // look for a Skills/Technical Skills section
  const lower = text.toLowerCase();
  const idx = lower.indexOf('skills');
  if(idx >= 0){
    // take the following 200 chars or until next header
    const tail = text.slice(idx, idx+400);
    const lines = tail.split(/\r?\n/);
    // remove the header line
    if(lines.length>1){
      const candidate = lines.slice(1,6).join(' ').replace(/[^A-Za-z0-9,;\s]/g,'');
      return candidate.trim();
    }
  }
  return null;
}

async function parseResume(filePath){
  const text = await parseTextFromFile(filePath);
  if(!text) return {};
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const name = extractName(text);
  const skills = extractSkills(text);
  return { text, email, phone, name, skills };
}

module.exports = { parseResume };
