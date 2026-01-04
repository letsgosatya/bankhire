const fs = require('fs');
const path = require('path');
(async ()=>{
  try{
    const uploads = path.join(__dirname, '..', 'uploads');
    if(!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
    const filePath = path.join(uploads, 'large_valid_test.pdf');
    console.log('Creating', filePath);
    const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const filler = Buffer.alloc(1024*1024, 0x20); // 1MB of spaces
    const fd = fs.openSync(filePath, 'w');
    fs.writeSync(fd, header);
    for(let i=0;i<25;i++) fs.writeSync(fd, filler); // ~25MB + header
    fs.writeSync(fd, Buffer.from('\n%%EOF'));
    fs.closeSync(fd);
    console.log('Created file size:', fs.statSync(filePath).size);
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();