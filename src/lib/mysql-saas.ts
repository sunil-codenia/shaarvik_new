import 'server-only';

import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

type PlatformRow = RowDataPacket & {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  server_type: 'same_server' | 'external';
  api_base_url: string | null;
  is_active: number;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  moduleCount?: number;
};

type ModuleRow = RowDataPacket & {
  id: string;
  platform_id: string;
  name: string;
  api_endpoint: string | null;
  description: string | null;
  is_active: number;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type PlanRow = RowDataPacket & {
  id: number;
  platform_id: number | null;
  name: string;
  price: string | number | null;
  billing_cycle: string | null;
  trial_days: number | null;
  description: string | null;
  is_active: number | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  platform_name?: string | null;
  module_count?: number;
};

type PlanModuleRow = RowDataPacket & {
  plan_id: number;
  module_id: number;
  created_at: Date | string | null;
};

let schemaReady: Promise<void> | null = null;

async function ensureColumn(
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [tableName, columnName]
  );

  if (Number(rows[0]?.count ?? 0) === 0) {
    await mysqlPool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

async function ensureTable(name: string, ddl: string): Promise<void> {
  await mysqlPool.query(ddl);
}

export async function ensureSaasRegistrySchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    // Only run expensive CREATE TABLE IF NOT EXISTS/ALTER TABLE if we suspect schema is incomplete
    const [columns] = await mysqlPool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM saas_plans LIKE 'is_active'"
    );

    if (columns.length === 0) {
      console.log('[MySQL] Updating SaaS Registry schema...');
      await ensureTable(
        'saas_platforms',
        `
          CREATE TABLE IF NOT EXISTS saas_platforms (
            id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name varchar(255) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      );

      await ensureTable(
        'saas_modules',
        `
          CREATE TABLE IF NOT EXISTS saas_modules (
            id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
            platform_id int NOT NULL,
            name varchar(255) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_saas_modules_platform
              FOREIGN KEY (platform_id) REFERENCES saas_platforms(id)
              ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      );

      await ensureColumn(
        'saas_platforms',
        'logo_url',
        '`logo_url` varchar(2048) NULL AFTER `name`'
      );
      await ensureColumn(
        'saas_platforms',
        'description',
        '`description` text NULL AFTER `logo_url`'
      );
      await ensureColumn(
        'saas_platforms',
        'server_type',
        '`server_type` varchar(32) NOT NULL DEFAULT \'same_server\' AFTER `description`'
      );
      await ensureColumn(
        'saas_platforms',
        'api_base_url',
        '`api_base_url` varchar(2048) NULL AFTER `server_type`'
      );
      await ensureColumn(
        'saas_platforms',
        'is_active',
        '`is_active` tinyint(1) NOT NULL DEFAULT 1 AFTER `api_base_url`'
      );
      await ensureColumn(
        'saas_modules',
        'platform_id',
        '`platform_id` int NULL AFTER `id`'
      );
      await ensureColumn(
        'saas_modules',
        'updated_at',
        '`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`'
      );
      await ensureColumn(
        'saas_platforms',
        'updated_at',
        '`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`'
      );
      await ensureColumn(
        'saas_modules',
        'api_endpoint',
        '`api_endpoint` varchar(2048) NULL AFTER `name`'
      );
      await ensureColumn(
        'saas_modules',
        'description',
        '`description` text NULL AFTER `api_endpoint`'
      );
      await ensureColumn(
        'saas_modules',
        'is_active',
        '`is_active` tinyint(1) NOT NULL DEFAULT 1 AFTER `description`'
      );
      await ensureColumn(
        'saas_modules',
        'external_id',
        '`external_id` int NULL AFTER `is_active`'
      );
      await ensureColumn(
        'saas_plans',
        'billing_cycle',
        '`billing_cycle` varchar(32) NOT NULL DEFAULT \'monthly\' AFTER `price`'
      );
      await ensureColumn(
        'saas_plans',
        'trial_days',
        '`trial_days` int NULL AFTER `billing_cycle`'
      );
      await ensureColumn(
        'saas_plans',
        'description',
        '`description` text NULL AFTER `trial_days`'
      );
      await ensureColumn(
        'saas_plans',
        'is_active',
        '`is_active` tinyint(1) NOT NULL DEFAULT 1 AFTER `description`'
      );
      await ensureColumn(
        'saas_plans',
        'updated_at',
        '`updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`'
      );

      await mysqlPool.query(
        `
          UPDATE saas_platforms
          SET server_type = 'same_server'
          WHERE server_type IS NULL OR server_type = ''
        `
      );

      await mysqlPool.query(
        `
          UPDATE saas_platforms
          SET is_active = 1
          WHERE is_active IS NULL
        `
      );

      await mysqlPool.query(
        `
          UPDATE saas_plans
          SET billing_cycle = 'monthly'
          WHERE billing_cycle IS NULL OR billing_cycle = ''
        `
      );

      await mysqlPool.query(
        `
          UPDATE saas_plans
          SET is_active = 1
          WHERE is_active IS NULL
        `
      );

      await mysqlPool.query(
        `
          UPDATE saas_modules
          SET is_active = 1
          WHERE is_active IS NULL
        `
      );
    }
  })();

  return schemaReady;
}

function normalizePlatform(row: PlatformRow) {
  return {
    id: String(row.id),
    name: row.name,
    logoUrl: row.logo_url,
    description: row.description,
    serverType: row.server_type || 'same_server',
    apiBaseUrl: row.api_base_url,
    isActive: Boolean(row.is_active),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    moduleCount: Number(row.moduleCount ?? 0),
  };
}

function normalizeModule(row: ModuleRow) {
  return {
    id: String(row.id),
    platformId: String(row.platform_id),
    name: row.name,
    apiEndpoint: row.api_endpoint,
    description: row.description,
    isActive: Boolean(row.is_active),
    externalId: row.external_id ? Number(row.external_id) : null,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function normalizePlan(row: PlanRow) {
  return {
    id: String(row.id),
    platformId: row.platform_id == null ? '' : String(row.platform_id),
    platformName: row.platform_name || 'Unknown',
    name: row.name,
    price: Number(row.price ?? 0),
    billingCycle: (row.billing_cycle || 'monthly') as
      | 'monthly'
      | 'quarterly'
      | 'yearly',
    trialDays: row.trial_days == null ? null : Number(row.trial_days),
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    moduleCount: Number(row.module_count ?? 0),
  };
}

export async function listSaasPlatforms() {
  await ensureSaasRegistrySchema();
  const [rows] = await mysqlPool.query<PlatformRow[]>(
    `
      SELECT
        p.id,
        p.name,
        p.logo_url,
        p.description,
        p.server_type,
        p.api_base_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COUNT(m.id) AS moduleCount
      FROM saas_platforms p
      LEFT JOIN saas_modules m ON m.platform_id = p.id
      GROUP BY
        p.id, p.name, p.logo_url, p.description, p.server_type,
        p.api_base_url, p.is_active, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `
  );

  return rows.map(normalizePlatform);
}

export async function listSaasModules(platformId?: string) {
  await ensureSaasRegistrySchema();
  const params: string[] = [];
  const where = platformId ? 'WHERE m.platform_id = ?' : '';
  if (platformId) params.push(platformId);

  const [rows] = await mysqlPool.query<ModuleRow[]>(
    `
      SELECT
        m.id,
        m.platform_id,
        m.name,
        m.api_endpoint,
        m.description,
        m.is_active,
        m.external_id,
        m.created_at,
        m.updated_at
      FROM saas_modules m
      ${where}
      ORDER BY m.created_at ASC
    `,
    params
  );

  return rows.map(normalizeModule);
}

export async function listSaasPlans() {
  await ensureSaasRegistrySchema();
  const [rows] = await mysqlPool.query<PlanRow[]>(
    `
      SELECT
        p.id,
        p.platform_id,
        p.name,
        p.price,
        p.billing_cycle,
        p.trial_days,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at,
        sp.name AS platform_name,
        COUNT(pm.id) AS module_count
      FROM saas_plans p
      LEFT JOIN saas_platforms sp ON sp.id = p.platform_id
      LEFT JOIN saas_plan_modules pm ON pm.plan_id = p.id
      GROUP BY
        p.id, p.platform_id, p.name, p.price, p.billing_cycle, p.trial_days,
        p.description, p.is_active, p.created_at, p.updated_at, sp.name
      ORDER BY p.created_at DESC, p.id DESC
    `
  );

  return rows.map(normalizePlan);
}

export async function listSaasPlanModules() {
  await ensureSaasRegistrySchema();
  const [rows] = await mysqlPool.query<PlanModuleRow[]>(
    `
      SELECT plan_id, module_id, created_at
      FROM saas_plan_modules
      ORDER BY created_at ASC, id ASC
    `
  );

  return rows.map((row) => ({
    planId: String(row.plan_id),
    moduleId: String(row.module_id),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));
}

export async function getSaasPlan(id: string) {
  await ensureSaasRegistrySchema();
  const [rows] = await mysqlPool.query<PlanRow[]>(
    `
      SELECT
        p.id,
        p.platform_id,
        p.name,
        p.price,
        p.billing_cycle,
        p.trial_days,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at,
        sp.name AS platform_name,
        (SELECT COUNT(*) FROM saas_plan_modules WHERE plan_id = p.id) AS module_count
      FROM saas_plans p
      LEFT JOIN saas_platforms sp ON sp.id = p.platform_id
      WHERE p.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (rows.length === 0) return null;

  const plan = normalizePlan(rows[0]);
  const [moduleRows] = await mysqlPool.query<PlanModuleRow[]>(
    `SELECT module_id FROM saas_plan_modules WHERE plan_id = ?`,
    [id]
  );

  return {
    ...plan,
    moduleIds: moduleRows.map((r) => String(r.module_id)),
  };
}

export async function syncExternalModules(platformId: string, externalModules: { id: number; name: string }[]) {
  await ensureSaasRegistrySchema();
  const results: string[] = [];

  for (const mod of externalModules) {
    // Check if module with this external_id already exists for this platform
    const [existing] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT id FROM saas_modules WHERE platform_id = ? AND external_id = ? LIMIT 1`,
      [platformId, mod.id]
    );

    if (existing.length > 0) {
      results.push(String(existing[0].id));
    } else {
      // Create it
      const [insert] = await mysqlPool.query<any>(
        `INSERT INTO saas_modules (platform_id, name, external_id, is_active) VALUES (?, ?, ?, 1)`,
        [platformId, mod.name, mod.id]
      );
      results.push(String(insert.insertId));
    }
  }

  return results;
}

async function replacePlanModules(planId: string, moduleIds: string[]) {
  const uniqueModuleIds = Array.from(
    new Set(moduleIds.map((moduleId) => String(moduleId).trim()).filter(Boolean))
  );

  await mysqlPool.query(`DELETE FROM saas_plan_modules WHERE plan_id = ?`, [planId]);

  if (uniqueModuleIds.length === 0) {
    return;
  }

  const values = uniqueModuleIds.map((moduleId) => [planId, moduleId]);
  await mysqlPool.query(
    `
      INSERT INTO saas_plan_modules (plan_id, module_id)
      VALUES ?
    `,
    [values]
  );
}

export async function createSaasPlatform(input: {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  serverType?: 'same_server' | 'external';
  apiBaseUrl?: string | null;
}) {
  await ensureSaasRegistrySchema();
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO saas_platforms (
        name, logo_url, description, server_type, api_base_url, is_active
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `,
    [
      input.name.trim(),
      input.logoUrl?.trim() || null,
      input.description?.trim() || null,
      input.serverType || 'same_server',
      input.apiBaseUrl?.trim() || null,
    ]
  );

  const id = String(result.insertId);
  const platforms = await listSaasPlatforms();
  return platforms.find((platform) => platform.id === id) ?? null;
}

export async function updateSaasPlatform(
  id: string,
  input: {
    name: string;
    logoUrl?: string | null;
    description?: string | null;
    serverType?: 'same_server' | 'external';
    apiBaseUrl?: string | null;
    isActive?: boolean;
  }
) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(
    `
      UPDATE saas_platforms
      SET
        name = ?,
        logo_url = ?,
        description = ?,
        server_type = ?,
        api_base_url = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `,
    [
      input.name.trim(),
      input.logoUrl?.trim() || null,
      input.description?.trim() || null,
      input.serverType || 'same_server',
      input.apiBaseUrl?.trim() || null,
      typeof input.isActive === 'boolean' ? Number(input.isActive) : null,
      id,
    ]
  );

  const platforms = await listSaasPlatforms();
  return platforms.find((platform) => platform.id === id) ?? null;
}

export async function toggleSaasPlatform(id: string, isActive: boolean) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(
    `UPDATE saas_platforms SET is_active = ? WHERE id = ?`,
    [Number(isActive), id]
  );
}

export async function deleteSaasPlatform(id: string) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(`DELETE FROM saas_platforms WHERE id = ?`, [id]);
}

export async function createSaasModule(input: {
  platformId: string;
  name: string;
  apiEndpoint?: string | null;
  description?: string | null;
}) {
  await ensureSaasRegistrySchema();
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO saas_modules (
        platform_id, name, api_endpoint, description, is_active
      )
      VALUES (?, ?, ?, ?, 1)
    `,
    [
      input.platformId,
      input.name.trim(),
      input.apiEndpoint?.trim() || null,
      input.description?.trim() || null,
    ]
  );

  const id = String(result.insertId);
  const modules = await listSaasModules(input.platformId);
  return modules.find((module) => module.id === id) ?? null;
}

export async function updateSaasModule(
  id: string,
  input: {
    name: string;
    apiEndpoint?: string | null;
    description?: string | null;
    isActive?: boolean;
  }
) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(
    `
      UPDATE saas_modules
      SET
        name = ?,
        api_endpoint = ?,
        description = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `,
    [
      input.name.trim(),
      input.apiEndpoint?.trim() || null,
      input.description?.trim() || null,
      typeof input.isActive === 'boolean' ? Number(input.isActive) : null,
      id,
    ]
  );
}

export async function toggleSaasModule(id: string, isActive: boolean) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(
    `UPDATE saas_modules SET is_active = ? WHERE id = ?`,
    [Number(isActive), id]
  );
}

export async function deleteSaasModule(id: string) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(`DELETE FROM saas_modules WHERE id = ?`, [id]);
}

export async function createSaasPlan(input: {
  platformId: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  trialDays?: number | null;
  description?: string | null;
  isActive?: boolean;
  moduleIds?: string[];
}) {
  await ensureSaasRegistrySchema();
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO saas_plans (
        platform_id, name, price, billing_cycle, trial_days, description, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.platformId,
      input.name.trim(),
      input.price,
      input.billingCycle,
      input.trialDays ?? null,
      input.description?.trim() || null,
      typeof input.isActive === 'boolean' ? Number(input.isActive) : 1,
    ]
  );

  const planId = String(result.insertId);
  await replacePlanModules(planId, input.moduleIds || []);
  const plans = await listSaasPlans();
  return plans.find((plan) => plan.id === planId) ?? null;
}

export async function updateSaasPlan(
  id: string,
  input: {
    platformId?: string;
    name: string;
    price: number;
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    trialDays?: number | null;
    description?: string | null;
    isActive?: boolean;
    moduleIds?: string[];
  }
) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(
    `
      UPDATE saas_plans
      SET
        platform_id = COALESCE(?, platform_id),
        name = ?,
        price = ?,
        billing_cycle = ?,
        trial_days = ?,
        description = ?,
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `,
    [
      input.platformId || null,
      input.name.trim(),
      input.price,
      input.billingCycle,
      input.trialDays ?? null,
      input.description?.trim() || null,
      typeof input.isActive === 'boolean' ? Number(input.isActive) : null,
      id,
    ]
  );

  if (Array.isArray(input.moduleIds)) {
    await replacePlanModules(id, input.moduleIds);
  }

  const plans = await listSaasPlans();
  return plans.find((plan) => plan.id === id) ?? null;
}

export async function toggleSaasPlan(id: string, isActive: boolean) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(`UPDATE saas_plans SET is_active = ? WHERE id = ?`, [
    Number(isActive),
    id,
  ]);
}

export async function deleteSaasPlan(id: string) {
  await ensureSaasRegistrySchema();
  await mysqlPool.query(`DELETE FROM saas_plans WHERE id = ?`, [id]);
}
