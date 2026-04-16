import 'server-only';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

export interface ClientRow extends RowDataPacket {
  id: number;
  name: string;
  display_name: string | null;
  company_name: string | null;
  address: string | null;
  gst_number: string | null;
  billing_email: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  company_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export async function listClients(companyId: string | null = null) {
  await ensureClientSchema();
  let query = `
    SELECT 
      c.id,
      c.name,
      c.display_name,
      c.company_name,
      c.address,
      c.gst_number,
      c.billing_email,
      c.email,
      c.phone,
      c.source,
      c.status as client_status,
      c.created_at,
      (
        SELECT p.name
        FROM subscriptions s
        LEFT JOIN saas_plans p ON s.saas_plan_id = p.id
        WHERE (s.client_id = c.id OR (s.client_id IS NULL AND s.company_id = c.company_id))
          AND s.status IN ('active', 'trial')
        ORDER BY s.createdAt DESC
        LIMIT 1
      ) as plan_name,
      (
        SELECT s.status
        FROM subscriptions s
        WHERE (s.client_id = c.id OR (s.client_id IS NULL AND s.company_id = c.company_id))
          AND s.status IN ('active', 'trial')
        ORDER BY s.createdAt DESC
        LIMIT 1
      ) as subscription_status
    FROM clients c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (companyId) {
    query += ' AND c.company_id = ?';
    params.push(Number(companyId));
  }

  query += ' ORDER BY c.created_at DESC';

  const [rows] = await mysqlPool.query<RowDataPacket[]>(query, params);

  return rows.map(row => ({
    id: String(row.id),
    name: row.name || 'Unknown',
    display_name: row.display_name || null,
    companyName: row.company_name || null,
    address: row.address || null,
    gstNumber: row.gst_number || null,
    billingEmail: row.billing_email || null,
    email: row.email || null,
    phone: row.phone || null,
    source: row.source || null,
    convertedDate: row.created_at || null,
    clientStatus: row.client_status || 'active',
    activePlan: row.plan_name || null,
    subscriptionStatus: row.subscription_status || null,
  }));
}

export async function getClientById(id: string) {
  await ensureClientSchema();
  const [rows] = await mysqlPool.query<ClientRow[]>(
    `
      SELECT
        id, name, display_name, company_name, address, gst_number, billing_email,
        email, phone, status, source, company_id, created_by, created_at, updated_at
      FROM clients
      WHERE id = ?
      LIMIT 1
    `,
    [Number(id)]
  );
  return rows[0] || null;
}

export async function updateClient(
  id: string,
  input: {
    name: string;
    displayName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstNumber?: string | null;
    billingEmail?: string | null;
    status?: string;
    source?: string | null;
  }
) {
  await ensureClientSchema();
  await mysqlPool.query(
    `
      UPDATE clients
      SET
        name = ?,
        display_name = ?,
        phone = ?,
        email = ?,
        address = ?,
        gst_number = ?,
        billing_email = ?,
        status = COALESCE(?, status),
        source = COALESCE(?, source)
      WHERE id = ?
    `,
    [
      input.name.trim(),
      input.displayName?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.address?.trim() || null,
      input.gstNumber?.trim() || null,
      input.billingEmail?.trim() || null,
      input.status || null,
      input.source || null,
      Number(id),
    ]
  );
}

export async function deleteClient(id: string) {
  await ensureClientSchema();
  await mysqlPool.query('DELETE FROM clients WHERE id = ?', [Number(id)]);
  return true;
}

export async function updateClientStatus(id: string, newStatus: string) {
  await ensureClientSchema();
  await mysqlPool.query('UPDATE clients SET status = ? WHERE id = ?', [newStatus, Number(id)]);
  return true;
}

let clientSchemaReady: Promise<void> | null = null;

async function ensureColumn(tableName: string, columnName: string, definition: string) {
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

async function ensureClientSchema() {
  if (clientSchemaReady) return clientSchemaReady;

  clientSchemaReady = (async () => {
    // Only run multi-step metadata checks if a sentinel column is missing
    const [columns] = await mysqlPool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM clients LIKE 'billing_email'"
    );

    if (columns.length === 0) {
      console.log('[MySQL] Updating clients schema...');
      await ensureColumn('clients', 'display_name', '`display_name` varchar(255) NULL AFTER `name`');
      await ensureColumn('clients', 'address', '`address` text NULL AFTER `phone`');
      await ensureColumn('clients', 'gst_number', '`gst_number` varchar(255) NULL AFTER `address`');
      await ensureColumn('clients', 'billing_email', '`billing_email` varchar(255) NULL AFTER `gst_number`');
    }
  })();

  return clientSchemaReady;
}
