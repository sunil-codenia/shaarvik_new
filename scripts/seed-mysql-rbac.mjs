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
  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    const modules = [
      ['Dashboard', 'Main dashboard and KPIs', 1],
      ['Clients', 'Client management', 2],
      ['Leads', 'Lead pipeline management', 3],
      ['Products', 'Product catalog management', 4],
      ['Subscriptions', 'Subscription management', 5],
      ['Billing', 'Invoices and payments', 6],
      ['Support', 'Support ticket management', 7],
      ['Marketing', 'Marketing campaigns and analytics', 8],
      ['Staff', 'Staff and user management', 9],
    ];

    for (const [name, description, sortOrder] of modules) {
      await connection.query(
        `
          INSERT INTO modules (name, description, status, sort_order)
          VALUES (?, ?, 'active', ?)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            status = VALUES(status),
            sort_order = VALUES(sort_order)
        `,
        [name, description, sortOrder]
      );
    }

    const roles = [
      ['Admin', 'Full system access', 1],
      ['Sales', 'Access to Leads and Clients modules', 1],
      ['Support', 'Access to Support Tickets module', 1],
      ['Accounts', 'Access to Billing module', 1],
    ];

    for (const [name, description, isSystem] of roles) {
      await connection.query(
        `
          INSERT INTO roles (name, description, is_system)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            is_system = VALUES(is_system)
        `,
        [name, description, isSystem]
      );
    }

    const [moduleRows] = await connection.query(
      `
        SELECT id, name
        FROM modules
      `
    );

    const [roleRows] = await connection.query(
      `
        SELECT id, name
        FROM roles
      `
    );

    const moduleByName = new Map(moduleRows.map((row) => [row.name, row.id]));
    const roleByName = new Map(roleRows.map((row) => [row.name, row.id]));

    const adminRoleId = roleByName.get('Admin');
    const salesRoleId = roleByName.get('Sales');
    const supportRoleId = roleByName.get('Support');
    const accountsRoleId = roleByName.get('Accounts');

    for (const [moduleName, moduleId] of moduleByName.entries()) {
      await connection.query(
        `
          INSERT INTO role_permissions (
            role_id, module_id, can_view, can_create, can_edit, can_delete
          )
          VALUES (?, ?, 1, 1, 1, 1)
          ON DUPLICATE KEY UPDATE
            can_view = VALUES(can_view),
            can_create = VALUES(can_create),
            can_edit = VALUES(can_edit),
            can_delete = VALUES(can_delete)
        `,
        [adminRoleId, moduleId]
      );
    }

    const salesModules = ['Dashboard', 'Leads', 'Clients'];
    for (const moduleName of salesModules) {
      await connection.query(
        `
          INSERT INTO role_permissions (
            role_id, module_id, can_view, can_create, can_edit, can_delete
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            can_view = VALUES(can_view),
            can_create = VALUES(can_create),
            can_edit = VALUES(can_edit),
            can_delete = VALUES(can_delete)
        `,
        [salesRoleId, moduleByName.get(moduleName), 1, 1, 1, 0]
      );
    }

    await connection.query(
      `
        INSERT INTO role_permissions (
          role_id, module_id, can_view, can_create, can_edit, can_delete
        )
        VALUES (?, ?, 1, 0, 0, 0)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_create = VALUES(can_create),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete)
      `,
      [supportRoleId, moduleByName.get('Dashboard')]
    );
    await connection.query(
      `
        INSERT INTO role_permissions (
          role_id, module_id, can_view, can_create, can_edit, can_delete
        )
        VALUES (?, ?, 1, 1, 1, 0)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_create = VALUES(can_create),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete)
      `,
      [supportRoleId, moduleByName.get('Support')]
    );

    await connection.query(
      `
        INSERT INTO role_permissions (
          role_id, module_id, can_view, can_create, can_edit, can_delete
        )
        VALUES (?, ?, 1, 0, 0, 0)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_create = VALUES(can_create),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete)
      `,
      [accountsRoleId, moduleByName.get('Dashboard')]
    );
    await connection.query(
      `
        INSERT INTO role_permissions (
          role_id, module_id, can_view, can_create, can_edit, can_delete
        )
        VALUES (?, ?, 1, 1, 1, 0)
        ON DUPLICATE KEY UPDATE
          can_view = VALUES(can_view),
          can_create = VALUES(can_create),
          can_edit = VALUES(can_edit),
          can_delete = VALUES(can_delete)
      `,
      [accountsRoleId, moduleByName.get('Billing')]
    );

    const [profileRows] = await connection.query(
      `
        SELECT id, userId, email
        FROM profiles
        ORDER BY id ASC
        LIMIT 1
      `
    );

    const adminProfile = profileRows[0];
    if (adminProfile) {
      await connection.query(
        `
          UPDATE profiles
          SET role = 'admin', roleId = ?, fullName = COALESCE(fullName, 'Shaarvik Admin')
          WHERE id = ?
        `,
        [adminRoleId, adminProfile.id]
      );
    }

    console.log('RBAC seed complete.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
