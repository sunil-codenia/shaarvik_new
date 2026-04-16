import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const parsed = new URL(connectionString);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: parsed.password ? decodeURIComponent(parsed.password) : '',
    database: parsed.pathname.replace(/^\//, ''),
  };
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'shaarvikadmin@gmail.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const fullName = process.env.ADMIN_NAME || 'Shaarvik Admin';

  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const [companyRows] = await connection.query(
      `
        SELECT id
        FROM companies
        ORDER BY createdAt ASC
        LIMIT 1
      `
    );
    const companyId = companyRows[0]?.id || null;

    const [roleRows] = await connection.query(
      `
        SELECT id
        FROM roles
        WHERE LOWER(name) = 'admin'
        LIMIT 1
      `
    );
    const roleId = roleRows[0]?.id || null;

    const [userRows] = await connection.query(
      `
        SELECT id
        FROM \`User\`
        WHERE email = ?
        LIMIT 1
      `,
      [email]
    );

    let userId = userRows[0]?.id;

    if (userId) {
      await connection.query(
        `
          UPDATE \`User\`
          SET passwordHash = ?
          WHERE id = ?
        `,
        [passwordHash, userId]
      );
    } else {
      const [userResult] = await connection.query(
        `
          INSERT INTO \`User\` (email, passwordHash)
          VALUES (?, ?)
        `,
        [email, passwordHash]
      );
      userId = String(userResult.insertId);
    }

    const [profileRows] = await connection.query(
      `
        SELECT id
        FROM profiles
        WHERE userId = ?
        LIMIT 1
      `,
      [userId]
    );

    if (profileRows[0]?.id) {
      await connection.query(
        `
          UPDATE profiles
          SET
            email = ?,
            fullName = ?,
            role = 'admin',
            companyId = ?,
            roleId = ?
          WHERE userId = ?
        `,
        [email, fullName, companyId, roleId, userId]
      );
    } else {
      await connection.query(
        `
          INSERT INTO profiles (
            userId,
            email,
            fullName,
            role,
            companyId,
            roleId
          )
          VALUES (?, ?, ?, 'admin', ?, ?)
        `,
        [userId, email, fullName, companyId, roleId]
      );
    }

    console.log(`Admin ready: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${userId}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
