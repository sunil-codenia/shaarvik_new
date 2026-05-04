import 'server-only';

import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  department_id: number | null;
  department_name: string | null;
  is_system: number;
  status: string;
  createdAt: Date | string | null;
};

type DepartmentRow = RowDataPacket & {
  id: number;
  name: string;
  description: string | null;
  status: string;
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
      SELECT r.id, r.name, r.description, r.department_id, d.name as department_name, r.is_system, r.status, r.createdAt
      FROM roles r
      LEFT JOIN departments d ON r.department_id = d.id
      ORDER BY r.name ASC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    name: row.name,
    description: row.description || '',
    departmentId: toStringId(row.department_id),
    departmentName: row.department_name || null,
    is_system: Boolean(row.is_system),
    status: row.status || 'active',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
}

export async function createRole(input: {
  name: string;
  description?: string | null;
  departmentId?: string | null;
}) {
  const departmentId = input.departmentId ? Number(input.departmentId) : null;
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO roles (name, description, department_id, is_system, status)
      VALUES (?, ?, ?, 0, 'active')
    `,
    [input.name.trim(), input.description?.trim() || null, departmentId]
  );

  return {
    id: String(result.insertId),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    department_id: toStringId(departmentId),
    is_system: false,
    status: 'active',
  };
}

export async function updateRole(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    departmentId?: string | null;
    status?: string;
  }
) {
  const fields: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description?.trim() || null);
  }
  if (input.departmentId !== undefined) {
    fields.push('department_id = ?');
    params.push(input.departmentId ? Number(input.departmentId) : null);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }

  if (fields.length === 0) return;

  params.push(id);
  await mysqlPool.query(
    `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

// ─── Departments ─────────────────────────────────────────────────────────────

export async function listDepartments() {
  const [rows] = await mysqlPool.query<DepartmentRow[]>(
    `
      SELECT id, name, description, status, createdAt
      FROM departments
      ORDER BY name ASC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    name: row.name,
    description: row.description || '',
    status: row.status || 'active',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
}

export async function createDepartment(input: {
  name: string;
  description?: string | null;
}) {
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO departments (name, description, status)
      VALUES (?, ?, 'active')
    `,
    [input.name.trim(), input.description?.trim() || null]
  );

  return {
    id: String(result.insertId),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    status: 'active',
  };
}

export async function updateDepartment(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    status?: string;
  }
) {
  const fields: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name.trim());
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    params.push(input.description?.trim() || null);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }

  if (fields.length === 0) return;

  params.push(id);
  await mysqlPool.query(
    `UPDATE departments SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

export async function deleteDepartment(id: string) {
  // Optional: check if roles are linked before deleting, or set them to null
  await mysqlPool.query(`UPDATE roles SET department_id = NULL WHERE department_id = ?`, [id]);
  await mysqlPool.query(`DELETE FROM departments WHERE id = ?`, [id]);
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
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT
        p.id,
        p.email,
        p.phone,
        p.fullName,
        p.role,
        p.roleId,
        r.name AS roleName,
        d.id AS departmentId,
        d.name AS departmentName,
        p.status,
        p.createdAt,
        p.updatedAt
      FROM profiles p
      LEFT JOIN roles r ON p.roleId = r.id
      LEFT JOIN departments d ON r.department_id = d.id
      ORDER BY p.createdAt DESC
    `
  );

  return rows.map((row) => ({
    id: toStringId(row.id),
    email: row.email,
    phone: row.phone || '',
    fullName: row.fullName || '',
    role: row.role || 'staff',
    roleId: row.roleId == null ? null : String(row.roleId),
    roleName: row.roleName || null,
    departmentId: row.departmentId == null ? null : String(row.departmentId),
    departmentName: row.departmentName || null,
    status: row.status || 'active',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
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

// ─── API Keys ────────────────────────────────────────────────────────────────

export async function listApiKeys() {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT key_id, value FROM api_keys'
  );
  return rows.map(r => ({ key_id: r.key_id, value: r.value }));
}

export async function upsertApiKey(key_id: string, value: string) {
  await mysqlPool.query(
    `INSERT INTO api_keys (key_id, value) VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [key_id, value]
  );
}

export async function updateProfile(
  id: string,
  input: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    roleId?: string | null;
    status?: string;
    companyId?: string | null;
  }
) {
  const fields: string[] = [];
  const params: any[] = [];

  if (input.fullName !== undefined) {
    fields.push('fullName = ?');
    params.push(input.fullName.trim());
  }
  if (input.email !== undefined) {
    fields.push('email = ?');
    params.push(input.email.trim());
  }
  if (input.phone !== undefined) {
    fields.push('phone = ?');
    params.push(input.phone || null);
  }
  if (input.roleId !== undefined) {
    fields.push('roleId = ?');
    params.push(input.roleId ? Number(input.roleId) : null);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }
  if (input.companyId !== undefined) {
    fields.push('companyId = ?');
    params.push(input.companyId ? Number(input.companyId) : null);
  }

  if (fields.length === 0) return;

  params.push(id);
  await mysqlPool.query(
    `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}
