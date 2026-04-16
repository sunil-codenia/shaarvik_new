import mysql from 'mysql2/promise';

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'shaarvik'
  });

  try {
    const [users] = await connection.query('SELECT id, email, passwordHash FROM User');
    console.log('Users found:', users);
    
    const [profiles] = await connection.query('SELECT * FROM profiles');
    console.log('Profiles found:', profiles);
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.end();
  }
}

checkUsers();
