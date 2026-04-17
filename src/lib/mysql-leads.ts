import 'server-only';

import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';
import { getOrCreateCompanyByName } from '@/lib/mysql-admin';

type LeadRow = RowDataPacket & {
  id: number;
  title: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  status: string | null;
  value: string | number | null;
  follow_up_date: string | null;
  notes: string | null;
  is_converted: number | null;
  company_id: number | null;
  campaign_id: number | null;
  converted_to_client_id: number | null;
  source: string | null;
  username: string | null;
  password_hash: string | null;
  password: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

let schemaReady: Promise<void> | null = null;

async function ensureColumn(tableName: string, definition: string): Promise<void> {
  await mysqlPool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN IF NOT EXISTS ${definition}`);
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    // Only run expensive ALTER TABLE if we suspect columns are missing
    // We can check if a specific newer column exists first
    const [columns] = await mysqlPool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM leads LIKE 'converted_to_client_id'"
    );

    if (columns.length === 0) {
      console.log('[MySQL] Updating leads schema...');
      await ensureColumn('leads', '`full_name` varchar(255) NULL AFTER `name`');
      await ensureColumn('leads', '`campaign_id` int NULL AFTER `company_id`');
      await ensureColumn('leads', '`deal_value` decimal(12,2) NULL AFTER `value`');
      await ensureColumn('leads', '`converted_to_client_id` int NULL AFTER `is_converted`');
      await ensureColumn('leads', '`source` varchar(255) NULL AFTER `converted_to_client_id`');
      await ensureColumn('leads', '`username` varchar(255) NULL AFTER `source`');
      await ensureColumn('leads', '`password_hash` varchar(255) NULL AFTER `username`');
      await ensureColumn('leads', '`password` varchar(255) NULL AFTER `password_hash`');
      
      await mysqlPool.query(`ALTER TABLE leads ADD KEY IF NOT EXISTS idx_leads_campaign_id (campaign_id)`).catch(() => undefined);
      await mysqlPool.query(`ALTER TABLE leads ADD KEY IF NOT EXISTS idx_leads_converted_to_client_id (converted_to_client_id)`).catch(() => undefined);
      await mysqlPool.query(`ALTER TABLE leads ADD KEY IF NOT EXISTS idx_leads_created_at (createdAt)`).catch(() => undefined);
    }
  })();

  return schemaReady;
}

export async function listCampaignsForLeads() {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT id, name
      FROM campaigns
      ORDER BY createdAt DESC, name ASC
    `
  );

  return rows.map((row: any) => ({ id: String(row.id), name: row.name }));
}

export async function listCampaignsWithPerformance(companyId: string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT 
        c.id, 
        c.name, 
        c.platform, 
        c.status, 
        c.budget, 
        c.spent_amount,
        (SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id) as leads_count,
        (SELECT COALESCE(SUM(i.paid_amount), 0) 
         FROM invoices i 
         JOIN clients cl ON i.client_id = cl.id 
         JOIN leads l ON l.converted_to_client_id = cl.id 
         WHERE l.campaign_id = c.id AND i.status = 'paid') as revenue
      FROM campaigns c
      WHERE c.company_id = ?
      ORDER BY c.createdAt DESC
    `,
    [companyId]
  );

  return rows.map((row: any) => ({
    id: String(row.id),
    name: row.name,
    platform: row.platform || 'Unknown',
    status: row.status || 'draft',
    budget: Number(row.budget || 0),
    spentAmount: Number(row.spent_amount || 0),
    leadsCount: Number(row.leads_count || 0),
    revenue: Number(row.revenue || 0),
    roi: Number(row.spent_amount) > 0 ? Number(row.revenue) / Number(row.spent_amount) : 0
  }));
}

export async function listLeadsByClientId(clientId: string) {
  await ensureSchema();

  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT
        id, title, full_name, phone, email, company_name, status, value, follow_up_date,
        notes, is_converted, company_id, campaign_id, converted_to_client_id, created_at
      FROM leads
      WHERE converted_to_client_id = ?
      ORDER BY created_at DESC
    `,
    [clientId]
  );

  return rows.map((row: any) => ({
    id: String(row.id),
    full_name: row.full_name || null,
    status: row.status || 'new',
    deal_value: row.value == null ? null : Number(row.value),
    follow_up_date: row.follow_up_date || null,
  }));
}

export async function listLeadsByClientOrCompanyId(clientId: string, companyId?: string | null) {
  await ensureSchema();

  const params: Array<string> = [clientId];
  let where = 'WHERE converted_to_client_id = ?';
  if (companyId) {
    where += ' OR company_id = ?';
    params.push(companyId);
  }

  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `
      SELECT
        id, title, full_name, phone, email, company_name, status, value, follow_up_date,
        notes, is_converted, company_id, campaign_id, converted_to_client_id, created_at
      FROM leads
      ${where}
      ORDER BY created_at DESC
    `,
    params
  );

  return rows.map((row: any) => ({
    id: String(row.id),
    full_name: row.full_name || null,
    status: row.status || 'new',
    deal_value: row.value == null ? null : Number(row.value),
    follow_up_date: row.follow_up_date || null,
  }));
}

export async function createLead(input: {
  fullName: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  campaignId?: string | null;
  dealValue?: number | null;
  followUpDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  source?: string | null;
  password?: string | null;
}) {
  await ensureSchema();

  if (!input.email || !input.companyName) {
    throw new Error('Email and Company Name are required.');
  }

  const company =
    input.companyName && input.companyName.trim()
      ? await getOrCreateCompanyByName(input.companyName.trim())
      : null;

  const passwordHash = input.password ? await require('bcryptjs').hash(input.password, 10) : null;
  const username = input.email.trim();
  const title = `Lead - ${input.fullName.trim()}`;

  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO leads (
        title,
        name,
        full_name,
        phone,
        email,
        company_name,
        status,
        value,
        deal_value,
        follow_up_date,
        notes,
        is_converted,
        company_id,
        campaign_id,
        created_by,
        source,
        username,
        password_hash,
        password
      )
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      input.fullName.trim(),
      input.fullName.trim(),
      input.phone.trim(),
      input.email.trim(),
      company?.name || input.companyName.trim(),
      input.dealValue ?? null,
      input.dealValue ?? null,
      input.followUpDate || null,
      input.notes?.trim() || null,
      company?.id || null,
      input.campaignId || null,
      input.createdBy || null,
      input.source || null,
      username,
      passwordHash,
      input.password || null,
    ]
  );

  return {
    id: String(result.insertId),
    companyId: company?.id || null,
  };
}

export async function getLeadById(id: string) {
  await ensureSchema();

  const [rows] = await mysqlPool.query<LeadRow[]>(
    `
      SELECT
        id,
        title,
        full_name,
        phone,
        email,
        company_name,
        status,
        value,
        follow_up_date,
        notes,
        is_converted,
        company_id,
        campaign_id,
        converted_to_client_id,
        source,
        username,
        password_hash,
        password,
        createdAt,
        updatedAt
      FROM leads
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    title: row.title,
    full_name: row.full_name || null,
    phone: row.phone || null,
    email: row.email || null,
    company_name: row.company_name || null,
    status: row.status || 'new',
    deal_value: row.value == null ? null : String(row.value),
    follow_up_date: row.follow_up_date,
    notes: row.notes || null,
    is_converted: Boolean(row.is_converted),
    company_id: row.company_id == null ? null : String(row.company_id),
    campaign_id: row.campaign_id == null ? null : String(row.campaign_id),
    converted_to_client_id:
      row.converted_to_client_id == null
        ? null
        : String(row.converted_to_client_id),
    username: row.username || null,
    password: row.password || null,
  };
}

export async function listLeads(filters: { status?: string; limit?: number; offset?: number } = {}) {
  await ensureSchema();

  let query = `
    SELECT
      id,
      title,
      full_name,
      phone,
      email,
      company_name,
      status,
      deal_value,
      follow_up_date,
      notes,
      is_converted,
      converted_to_client_id,
      createdAt,
      updatedAt
    FROM leads
  `;
  const params: any[] = [];

  if (filters.status && filters.status !== 'all') {
    query += ' WHERE status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY createdAt DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(Number(filters.limit));
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(Number(filters.offset));
    }
  }

  const [rows] = await mysqlPool.query<LeadRow[]>(query, params);

  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    full_name: row.full_name || null,
    phone: row.phone || null,
    email: row.email || null,
    company_name: row.company_name || null,
    status: row.status || 'new',
    deal_value: row.deal_value == null ? null : Number(row.deal_value),
    follow_up_date: row.follow_up_date,
    notes: row.notes || null,
    is_converted: Boolean(row.is_converted),
    converted_to_client_id: row.converted_to_client_id ? String(row.converted_to_client_id) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function updateLead(id: string, data: Partial<{
  fullName: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  status: string;
  dealValue: number | null;
  followUpDate: string | null;
  notes: string | null;
}>) {
  await ensureSchema();

  const fields: string[] = [];
  const params: any[] = [];

  if (data.fullName !== undefined) {
    fields.push('full_name = ?', 'name = ?', 'title = ?');
    params.push(data.fullName, data.fullName, `Lead - ${data.fullName}`);
  }
  if (data.phone !== undefined) { fields.push('phone = ?'); params.push(data.phone); }
  if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }
  if (data.companyName !== undefined) { fields.push('company_name = ?'); params.push(data.companyName); }
  if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
  if (data.dealValue !== undefined) { fields.push('deal_value = ?', 'value = ?'); params.push(data.dealValue, data.dealValue); }
  if (data.followUpDate !== undefined) { fields.push('follow_up_date = ?'); params.push(data.followUpDate); }
  if (data.notes !== undefined) { fields.push('notes = ?'); params.push(data.notes); }

  if (fields.length === 0) return;

  params.push(id);
  await mysqlPool.query(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

export async function deleteLead(id: string) {
  await ensureSchema();
  await mysqlPool.query('DELETE FROM leads WHERE id = ?', [id]);
}
