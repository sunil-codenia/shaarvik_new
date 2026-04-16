import 'server-only';

import bcrypt from 'bcryptjs';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: string;
  companyId: string | null;
  roleId: string | null;
  profileId: string;
}

type AuthUserRow = RowDataPacket & AuthUserRecord;

type PermissionRow = RowDataPacket & {
  moduleId: string;
  moduleName: string;
  canView: number;
  canCreate: number;
  canEdit: number;
  canDelete: number;
};

type IdRow = RowDataPacket & {
  id: string;
};

type CompanyRow = RowDataPacket & {
  id: string;
  name: string;
  email: string | null;
};

type ProfileRecord = {
  id: string;
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  companyId: string | null;
  roleId: string | null;
};

type ProfileRow = RowDataPacket & ProfileRecord;

async function getProfileByEmail(
  connection: PoolConnection,
  email: string
): Promise<ProfileRecord | null> {
  const [rows] = await connection.query<ProfileRow[]>(
    `
      SELECT
        CAST(id AS CHAR) AS id,
        CAST(userId AS CHAR) AS userId,
        email,
        COALESCE(fullName, '') AS fullName,
        COALESCE(role, 'staff') AS role,
        CAST(companyId AS CHAR) AS companyId,
        CAST(roleId AS CHAR) AS roleId
      FROM profiles
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

async function getCompanyByEmail(
  connection: PoolConnection,
  email: string
): Promise<CompanyRow | null> {
  const [rows] = await connection.query<CompanyRow[]>(
    `
      SELECT CAST(id AS CHAR) AS id, name, email
      FROM companies
      WHERE LOWER(email) = LOWER(?)
      ORDER BY createdAt ASC
      LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

export async function getAuthUserByEmail(email: string) {
  const [rows] = await mysqlPool.query<AuthUserRow[]>(
    `
      SELECT
        CAST(u.id AS CHAR) AS id,
        u.email,
        u.passwordHash,
        CAST(p.id AS CHAR) AS profileId,
        COALESCE(p.fullName, '') AS fullName,
        COALESCE(p.role, 'staff') AS role,
        CAST(p.companyId AS CHAR) AS companyId,
        CAST(p.roleId AS CHAR) AS roleId
      FROM User u
      LEFT JOIN profiles p ON p.userId = u.id
      WHERE LOWER(u.email) = LOWER(?)
      LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

export async function getAuthUserByIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return null;

  const [rows] = await mysqlPool.query<AuthUserRow[]>(
    `
      SELECT
        CAST(u.id AS CHAR) AS id,
        u.email,
        u.passwordHash,
        CAST(p.id AS CHAR) AS profileId,
        COALESCE(p.fullName, '') AS fullName,
        COALESCE(p.role, 'staff') AS role,
        CAST(p.companyId AS CHAR) AS companyId,
        CAST(p.roleId AS CHAR) AS roleId
      FROM User u
      LEFT JOIN profiles p ON p.userId = u.id
      WHERE LOWER(u.email) = LOWER(?)
         OR LOWER(SUBSTRING_INDEX(u.email, '@', 1)) = LOWER(?)
      LIMIT 1
    `,
    [value, value]
  );

  return rows[0] ?? null;
}

export async function getRoleIdByName(roleName: string): Promise<string | null> {
  const [rows] = await mysqlPool.query<IdRow[]>(
    `
      SELECT CAST(id AS CHAR) AS id
      FROM roles
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [roleName]
  );

  return rows[0]?.id ?? null;
}

export async function getAuthUserById(userId: string) {
  const [rows] = await mysqlPool.query<AuthUserRow[]>(
    `
      SELECT
        CAST(u.id AS CHAR) AS id,
        u.email,
        u.passwordHash,
        CAST(p.id AS CHAR) AS profileId,
        COALESCE(p.fullName, '') AS fullName,
        COALESCE(p.role, 'staff') AS role,
        CAST(p.companyId AS CHAR) AS companyId,
        CAST(p.roleId AS CHAR) AS roleId
      FROM User u
      LEFT JOIN profiles p ON p.userId = u.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] ?? null;
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export async function createAuthUserWithCompany(input: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  role?: string;
}): Promise<{
  userId: string;
  profileId: string;
  companyId: string | null;
  email: string;
}> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const companyName = input.companyName.trim();
  const role = (input.role || 'admin').trim().toLowerCase();

  if (!email || !input.password || !fullName || !companyName) {
    throw new Error('Email, password, full name, and company name are required.');
  }

  const connection = await mysqlPool.getConnection();

  try {
    await connection.beginTransaction();

    const existingUser = await getAuthUserByEmail(email);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const existingProfile = await getProfileByEmail(connection, email);
    const existingCompany = await getCompanyByEmail(connection, email);
    const passwordHash = await bcrypt.hash(input.password, 10);
    let userId = existingProfile?.userId || null;
    let profileId = existingProfile?.id || null;
    let companyId = existingProfile?.companyId || existingCompany?.id || null;
    const roleId = await getRoleIdByName(role);

    if (existingCompany) {
      await connection.query(
        `
          UPDATE companies
          SET name = ?, email = ?
          WHERE id = ?
        `,
        [companyName, email, existingCompany.id]
      );
      companyId = String(existingCompany.id);
    } else if (!existingProfile?.companyId) {
      const [companyResult] = await connection.query<any>(
        `
          INSERT INTO companies (name, email)
          VALUES (?, ?)
        `,
        [companyName, email]
      );
      companyId = String(companyResult.insertId);
    }

    const [userResult] = await connection.query<any>(
      `
        INSERT INTO \`User\` (email, passwordHash)
        VALUES (?, ?)
      `,
      [email, passwordHash]
    );
    userId = String(userResult.insertId);

    if (existingProfile) {
      await connection.query(
        `
          UPDATE profiles
          SET
            userId = ?,
            email = ?,
            fullName = ?,
            role = ?,
            companyId = ?,
            roleId = ?
          WHERE id = ?
        `,
        [userId, email, fullName, role, companyId, roleId, profileId]
      );
    } else {
      const [profileResult] = await connection.query<any>(
        `
          INSERT INTO profiles (
            userId,
            email,
            fullName,
            role,
            companyId,
            roleId
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [userId, email, fullName, role, companyId, roleId]
      );
      profileId = String(profileResult.insertId);
    }

    await connection.commit();

    return {
      userId: String(userId),
      profileId: String(profileId),
      companyId,
      email,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPermissionsForUser(userId: string) {
  const user = await getAuthUserById(userId);
  if (!user) return { isAdmin: false, permissions: [] };

  if ((user.role || '').toLowerCase() === 'admin') {
    return { isAdmin: true, permissions: [] };
  }

  if (!user.roleId) {
    return { isAdmin: false, permissions: [] };
  }

  const [rows] = await mysqlPool.query<PermissionRow[]>(
    `
      SELECT
        CAST(m.id AS CHAR) AS moduleId,
        m.name AS moduleName,
        rp.can_view AS canView,
        rp.can_create AS canCreate,
        rp.can_edit AS canEdit,
        rp.can_delete AS canDelete
      FROM role_permissions rp
      INNER JOIN modules m ON m.id = rp.module_id
      WHERE rp.role_id = ?
      ORDER BY m.sort_order ASC, m.name ASC
    `,
    [user.roleId]
  );

  return {
    isAdmin: false,
    permissions: rows.map((row) => ({
      moduleId: row.moduleId,
      moduleName: row.moduleName,
      canView: Boolean(row.canView),
      canCreate: Boolean(row.canCreate),
      canEdit: Boolean(row.canEdit),
      canDelete: Boolean(row.canDelete),
    })),
  };
}
