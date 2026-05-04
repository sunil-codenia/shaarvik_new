import 'server-only';
import { RowDataPacket } from 'mysql2/promise';
import { mysqlPool } from '@/lib/mysql';

// --- Tasks ---
export async function listTasksByCompanyId(companyId: string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM tasks WHERE company_id = ? ORDER BY due_date ASC, createdAt DESC',
    [companyId]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: String(row.company_id),
    client_id: row.client_id ? String(row.client_id) : null,
    lead_id: row.lead_id ? String(row.lead_id) : null,
    assigned_to: row.assigned_to ? String(row.assigned_to) : null,
    created_by: row.created_by ? String(row.created_by) : null,
  }));
}

// --- Activities ---
export async function listActivitiesByCompanyId(companyId: string, limit: number = 100) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM activities WHERE company_id = ? ORDER BY activity_date DESC LIMIT ?',
    [companyId, limit]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: String(row.company_id),
    client_id: row.client_id ? String(row.client_id) : null,
    lead_id: row.lead_id ? String(row.lead_id) : null,
    logged_by: row.logged_by ? String(row.logged_by) : null,
  }));
}

export async function listActivitiesByLeadId(leadId: string, limit: number = 100) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM activities WHERE lead_id = ? ORDER BY activity_date DESC LIMIT ?',
    [leadId, limit]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: row.company_id ? String(row.company_id) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    lead_id: String(row.lead_id),
    logged_by: row.logged_by ? String(row.logged_by) : null,
  }));
}

export async function createActivity(input: {
  lead_id?: string | null;
  client_id?: string | null;
  company_id?: string | null;
  type: string;
  summary: string;
  notes?: string | null;
  activity_date?: string | null;
  logged_by?: string | null;
}) {
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO activities (
        lead_id, client_id, company_id, type, summary, notes, activity_date, logged_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.lead_id || null,
      input.client_id || null,
      input.company_id || null,
      input.type || 'note',
      input.summary,
      input.notes || null,
      input.activity_date || new Date().toISOString().slice(0, 19).replace('T', ' '),
      input.logged_by || null,
    ]
  );

  return { id: String(result.insertId) };
}

// --- Products ---
export async function listActiveProducts() {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    'SELECT * FROM products WHERE is_active = 1 AND status = "active" ORDER BY name ASC'
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
  }));
}

// --- Subscriptions ---
export async function listSubscriptionsByCompanyId(companyId: string | null = null) {
  await ensureSubscriptionSchema();
  const params: Array<string> = [];
  const where = companyId ? 'WHERE s.company_id = ?' : '';
  if (companyId) params.push(companyId);
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.*, c.name as company_name, c.email as company_email, cl.name as client_name, cl.email as client_email, cl.display_name as client_display_name, p.name as plan_name, sp.name as platform_name
     FROM subscriptions s 
     LEFT JOIN companies c ON c.id = s.company_id 
     LEFT JOIN clients cl ON cl.id = s.client_id
     LEFT JOIN saas_plans p ON p.id = s.saas_plan_id
     LEFT JOIN saas_platforms sp ON sp.id = p.platform_id
     ${where}
     ORDER BY s.createdAt DESC`,
    params
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: row.company_id ? String(row.company_id) : null,
    saas_plan_id: row.saas_plan_id ? String(row.saas_plan_id) : null,
    companies: {
      id: row.company_id ? String(row.company_id) : null,
      name: row.company_name,
      email: row.company_email,
    },
    saas_plans: {
      name: row.plan_name || null,
      saas_platforms: { name: row.platform_name || null },
    },
  }));
}

export async function listSubscriptionsByClientId(clientId: string, companyId?: string | null) {
  await ensureSubscriptionSchema();
  const params: Array<string> = [clientId];
  let where = 'WHERE s.client_id = ?';
  if (companyId) {
    where += ' OR s.company_id = ?';
    params.push(companyId);
  }
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.*, c.name as company_name, c.email as company_email, cl.name as client_name, cl.email as client_email, cl.display_name as client_display_name, p.name as plan_name, sp.name as platform_name
     FROM subscriptions s
     LEFT JOIN companies c ON c.id = s.company_id
     LEFT JOIN clients cl ON cl.id = s.client_id
     LEFT JOIN saas_plans p ON p.id = s.saas_plan_id
     LEFT JOIN saas_platforms sp ON sp.id = p.platform_id
     ${where}
     ORDER BY s.createdAt DESC`,
    params
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: row.company_id ? String(row.company_id) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    saas_plan_id: row.saas_plan_id ? String(row.saas_plan_id) : null,
    companies: {
      id: String(row.company_id),
      name: row.company_name,
      email: row.company_email,
    },
    saas_plans: {
      name: row.plan_name || null,
      saas_platforms: { name: row.platform_name || null },
    },
  }));
}

export async function getSubscriptionById(id: string) {
  await ensureSubscriptionSchema();
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT s.*, c.name as company_name, c.email as company_email, cl.name as client_name, cl.email as client_email, cl.display_name as client_display_name, p.name as plan_name, sp.name as platform_name
     FROM subscriptions s
     LEFT JOIN companies c ON c.id = s.company_id
     LEFT JOIN clients cl ON cl.id = s.client_id
     LEFT JOIN saas_plans p ON p.id = s.saas_plan_id
     LEFT JOIN saas_platforms sp ON sp.id = p.platform_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    id: String(row.id),
    company_id: row.company_id ? String(row.company_id) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    saas_plan_id: row.saas_plan_id ? String(row.saas_plan_id) : null,
    companies: {
      id: row.company_id ? String(row.company_id) : null,
      name: row.company_name,
      email: row.company_email,
    },
    saas_plans: {
      name: row.plan_name || null,
      saas_platforms: { name: row.platform_name || null },
    },
  };
}

export async function createSubscription(input: {
  clientId: string | number;
  companyId: string | number | null;
  saasPlanId: string | number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  billingCycle: string;
  paymentMode: string;
  amount: number;
  amountPaid: number;
  notes: string | null;
  transactionId?: string | null;
  gateway?: string | null;
}) {
  await ensureSubscriptionSchema();
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO subscriptions (
        client_id, company_id, saas_plan_id, billing_cycle, start_date, end_date,
        status, payment_mode, amount, amount_paid, notes, transaction_id, gateway
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number(input.clientId),
      input.companyId == null ? null : Number(input.companyId),
      input.saasPlanId == null ? null : Number(input.saasPlanId),
      input.billingCycle,
      input.startDate,
      input.endDate,
      input.status,
      input.paymentMode,
      input.amount,
      input.amountPaid,
      input.notes,
      input.transactionId || null,
      input.gateway || 'manual',
    ]
  );

  return { id: String(result.insertId) };
}

export async function updateSubscription(
  id: string,
  input: Partial<{
    saasPlanId: string | null;
    billingCycle: string;
    startDate: string | null;
    endDate: string | null;
    status: string;
    paymentMode: string;
    amountPaid: number;
    notes: string | null;
    transactionId?: string | null;
    gateway?: string | null;
  }>
) {
  await ensureSubscriptionSchema();
  await mysqlPool.query(
    `
      UPDATE subscriptions
      SET
        saas_plan_id = COALESCE(?, saas_plan_id),
        billing_cycle = COALESCE(?, billing_cycle),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        payment_mode = COALESCE(?, payment_mode),
        amount = COALESCE(?, amount),
        amount_paid = COALESCE(?, amount_paid),
        notes = COALESCE(?, notes),
        transaction_id = COALESCE(?, transaction_id),
        gateway = COALESCE(?, gateway)
      WHERE id = ?
    `,
    [
      input.saasPlanId ?? null,
      input.billingCycle ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.status ?? null,
      input.paymentMode ?? null,
      input.amount ?? null,
      input.amountPaid ?? null,
      input.notes ?? null,
      input.transactionId ?? null,
      input.gateway ?? null,
      id,
    ]
  );
}

export async function deleteSubscription(id: string) {
  await ensureSubscriptionSchema();
  await mysqlPool.query('DELETE FROM subscriptions WHERE id = ?', [id]);
}

// --- Subscription History / Ledger ---

export async function listSubscriptionHistory(subscriptionId: string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT h.*, p_prev.name as prev_plan_name, p_new.name as new_plan_name
     FROM subscription_history h
     LEFT JOIN saas_plans p_prev ON p_prev.id = h.previous_plan_id
     LEFT JOIN saas_plans p_new ON p_new.id = h.new_plan_id
     WHERE h.subscription_id = ?
     ORDER BY h.createdAt DESC`,
    [subscriptionId]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    subscription_id: String(row.subscription_id),
    client_id: String(row.client_id),
    previous_plan_id: row.previous_plan_id ? String(row.previous_plan_id) : null,
    new_plan_id: row.new_plan_id ? String(row.new_plan_id) : null,
  }));
}

export async function createSubscriptionHistory(input: {
  subscriptionId: string | number;
  clientId: string | number;
  companyId?: string | number | null;
  previousPlanId?: string | number | null;
  newPlanId?: string | number | null;
  eventType: 'CREATION' | 'RENEWAL' | 'UPGRADE' | 'DOWNGRADE' | 'CANCELLATION';
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  gateway?: string | null;
}) {
  const [result] = await mysqlPool.query<any>(
    `
      INSERT INTO subscription_history (
        subscription_id, client_id, company_id, previous_plan_id, new_plan_id,
        event_type, amount, start_date, end_date, notes, transaction_id, gateway
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number(input.subscriptionId),
      Number(input.clientId),
      input.companyId == null ? null : Number(input.companyId),
      input.previousPlanId == null ? null : Number(input.previousPlanId),
      input.newPlanId == null ? null : Number(input.newPlanId),
      input.eventType,
      input.amount || null,
      input.startDate || null,
      input.endDate || null,
      input.notes || null,
      input.transactionId || null,
      input.gateway || null,
    ]
  );
  return { id: String(result.insertId) };
}

let subscriptionSchemaReady: Promise<void> | null = null;

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

async function ensureSubscriptionSchema() {
  if (subscriptionSchemaReady) return subscriptionSchemaReady;

  subscriptionSchemaReady = (async () => {
    // Only run multi-step metadata checks if a sentinel column is missing
    const [columns] = await mysqlPool.query<RowDataPacket[]>(
      "SHOW COLUMNS FROM subscriptions LIKE 'client_id'"
    );

    if (columns.length === 0) {
      console.log('[MySQL] Updating subscriptions schema...');
      await ensureColumn('subscriptions', 'client_id', '`client_id` int NULL AFTER `company_id`');
      await mysqlPool.query(
        `ALTER TABLE subscriptions ADD KEY IF NOT EXISTS idx_subscriptions_client_id (client_id)`
      ).catch(() => undefined);
      await mysqlPool.query(
        `ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL`
      ).catch(() => undefined);
    }
  })();

  return subscriptionSchemaReady;
}

// --- Invoices ---
export async function listInvoicesByCompanyId(companyId: string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT 
      i.*, 
      sp.name as plan_name,
      plt.name as platform_name,
      s.billing_cycle,
      c.name as provider_name, 
      c.email as provider_email,
      cl.name as client_name,
      cl.email as client_email,
      cl.phone as client_phone,
      cl.address as client_address,
      cl.gst_number as client_gst
     FROM invoices i
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     LEFT JOIN saas_plans sp ON sp.id = s.saas_plan_id
     LEFT JOIN saas_platforms plt ON plt.id = sp.platform_id
     LEFT JOIN companies c ON c.id = i.company_id
     LEFT JOIN clients cl ON cl.id = i.client_id
     WHERE i.company_id = ?
     ORDER BY i.createdAt DESC`,
    [companyId]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: String(row.company_id),
    subscription_id: row.subscription_id ? String(row.subscription_id) : null,
    product_id: row.product_id ? String(row.product_id) : null,
    gateway: row.gateway, // Include payment mode/gateway
    // Add explicitly mapped names for the frontend
    provider: {
      name: row.provider_name,
      email: row.provider_email,
    },
    client: {
      name: row.client_name,
      email: row.client_email,
      phone: row.client_phone,
      address: row.client_address,
      gst: row.client_gst,
    },
    subscription_plan: row.plan_name 
      ? `${row.plan_name}${row.platform_name ? ` - ${row.platform_name}` : ''} (${row.billing_cycle || 'monthly'})` 
      : (row.subscription_id ? 'SaaS Subscription' : 'SaaS Product')
  }));
}

// --- Support Tickets ---
export async function listTicketsByCompanyId(companyId: string) {
  const [rows] = await mysqlPool.query<RowDataPacket[]>(
    `SELECT t.*, p.name as product_name
     FROM support_tickets t
     LEFT JOIN products p ON p.id = t.product_id
     WHERE t.company_id = ?
     ORDER BY t.updatedAt DESC`,
    [companyId]
  );
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    company_id: String(row.company_id),
    product_id: row.product_id ? String(row.product_id) : null,
    products: {
      name: row.product_name
    }
  }));
}
