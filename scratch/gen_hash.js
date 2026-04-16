const bcrypt = require('bcryptjs');
const password = 'Admin@123';
bcrypt.hash(password, 10, (err, hash) => {
  console.log(hash);
});
