import 'server-only';

import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  is_system: number;
  createdAt: Date | string | null;
};

type ModuleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  sort_order: number | null;
};

type PermissionRow = RowDataPacket & {
  role_id: number;
  module_id: number;
  can_view: number;
  can_create: number;
  can_edit: number;
  can_delete: number;
};

type ProfileRow = RowDataPacket & {
  id: number;
  email: string;
  fullName: string | null;
  role: string | null;
  roleId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

type CampaignRow = RowDataPacket & {
  id: number;
  name: string;
};

type CompanyRow = RowDataPacket & {
  id: number;
  name: string;
};

function toStringId(value: number | string | null | undefined): string {
  return value == null ? '' : String(value);
}

export async function listRoles() {
  const [rows] = await mysqlPool.query<RoleRow[]>(
    `
      SELECT id, name, description, is_system, createdAt
      FROM roles
      ORDER BY name ASC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    name: row.name,
    description: row.description || '',
    is_system: Boolean(row.is_system),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
}

export async function createRole(input: { name: string; description?: string | null }) {
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO roles (name, description, is_system)
      VALUES (?, ?, 0)
    `,
    [input.name.trim(), input.description?.trim() || null]
  );

  return {
    id: String(result.insertId),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    is_system: false,
  };
}

export async function deleteRole(roleId: string) {
  await mysqlPool.query(`DELETE FROM roles WHERE id = ?`, [roleId]);
}

export async function listModules() {
  const [rows] = await mysqlPool.query<ModuleRow[]>(
    `
      SELECT id, name, description, status, sort_order
      FROM modules
      ORDER BY sort_order ASC, name ASC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    name: row.name,
    description: row.description || '',
    status: row.status || 'active',
    sort_order: Number(row.sort_order ?? 0),
  }));
}

export async function listRolePermissions() {
  const [rows] = await mysqlPool.query<PermissionRow[]>(
    `
      SELECT role_id, module_id, can_view, can_create, can_edit, can_delete
      FROM role_permissions
    `
  );

  return rows.map((row) => ({
    role_id: toStringId(row.role_id),
    module_id: toStringId(row.module_id),
    can_view: Boolean(row.can_view),
    can_create: Boolean(row.can_create),
    can_edit: Boolean(row.can_edit),
    can_delete: Boolean(row.can_delete),
  }));
}

export async function upsertRolePermissions(
  items: Array<{
    role_id: string;
    module_id: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>
) {
  if (items.length === 0) return;
  const values = items.map((item) => [
    item.role_id,
    item.module_id,
    Number(item.can_view),
    Number(item.can_create),
    Number(item.can_edit),
    Number(item.can_delete),
  ]);

  await mysqlPool.query(
    `
      INSERT INTO role_permissions (
        role_id, module_id, can_view, can_create, can_edit, can_delete
      )
      VALUES ?
      ON DUPLICATE KEY UPDATE
        can_view = VALUES(can_view),
        can_create = VALUES(can_create),
        can_edit = VALUES(can_edit),
        can_delete = VALUES(can_delete)
    `,
    [values]
  );
}

export async function listProfiles() {
  const [rows] = await mysqlPool.query<ProfileRow[]>(
    `
      SELECT
        p.id,
        p.email,
        p.fullName,
        p.role,
        p.roleId,
        p.createdAt,
        p.updatedAt
      FROM profiles p
      ORDER BY p.createdAt DESC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    email: row.email,
    full_name: row.fullName || '',
    role: row.role || '',
    role_id: row.roleId == null ? null : String(row.roleId),
    created_at:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updated_at:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }));
}

export async function assignProfileRole(
  profileId: string,
  input: { roleId: string | null; roleName: string | null }
) {
  await mysqlPool.query(
    `
      UPDATE profiles
      SET roleId = ?, role = ?
      WHERE id = ?
    `,
    [input.roleId || null, input.roleName || null, profileId]
  );
}

export async function listCampaigns() {
  const [rows] = await mysqlPool.query<CampaignRow[]>(
    `
      SELECT id, name
      FROM campaigns
      ORDER BY createdAt DESC, name ASC
    `
  );

  return rows.map((row) => ({ id: toStringId(row.id), name: row.name }));
}

export async function getOrCreateCompanyByName(name: string) {
  const companyName = name.trim();
  if (!companyName) return null;

  const [existingRows] = await mysqlPool.query<CompanyRow[]>(
    `
      SELECT id, name
      FROM companies
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [companyName]
  );

  const existing = existingRows[0];
  if (existing) {
    return { id: String(existing.id), name: existing.name };
  }

  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO companies (name)
      VALUES (?)
    `,
    [companyName]
  );

  return { id: String(result.insertId), name: companyName };
}
