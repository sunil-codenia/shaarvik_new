const bcrypt = require('bcryptjs');
const plain = 'Admin@12345';
const hash = '$2b$10$wEC3AWkT1dC12eN3ZseSr..Gut8cSJ3AdqnuQUo0Qc5Qn5kuYWYQe';

bcrypt.compare(plain, hash).then(res => {
  console.log('Password valid:', res);
});
