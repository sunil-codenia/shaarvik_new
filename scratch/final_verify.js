const bcrypt = require('bcryptjs');
const plain = 'Admin@12345';
const hash = '$2b$10$NdknhzFxDTpiw5nGi1SMRu3tZcS3Wf6jKceXTOPcR.zhtOVmKaCfa';

console.log('Plain:', plain);
console.log('Hash:', hash);
console.log('Match:', bcrypt.compareSync(plain, hash));
