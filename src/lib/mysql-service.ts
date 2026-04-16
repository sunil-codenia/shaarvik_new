import 'server-only';

import { RowDataPacket } from 'mysql2/promise';

import { mysqlPool } from '@/lib/mysql';

type ProfileRow = RowDataPacket & {
  id: string;
  userId: string;
  email: string | null;
  companyId: string | null;
};

type ProjectRow = RowDataPacket & {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  company_id: string | null;
  created_at: Date | string | null;
};

type DashboardInvoiceRow = RowDataPacket & {
  status: string | null;
  paid_amount: string | number | null;
  final_amount: string | number | null;
  balance_amount: string | number | null;
};

type DashboardCampaignRow = RowDataPacket & {
  spent_amount: string | number | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

export async function getProfileByUserId(userId: string) {
  const [rows] = await mysqlPool.query<ProfileRow[]>(
    `
      SELECT id, userId, email, companyId
      FROM profiles
      WHERE userId = ? OR id = ?
      LIMIT 1
    `,
    [userId, userId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.userId ?? row.id,
    company_id: row.companyId ?? null,
    email: row.email ?? null,
  };
}

export async function getProjectsByCompanyId(companyId: string) {
  const [rows] = await mysqlPool.query<ProjectRow[]>(
    `
      SELECT
        id,
        name,
        description,
        status,
        company_id,
        created_at
      FROM projects
      WHERE company_id = ?
      ORDER BY created_at DESC
    `,
    [companyId]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status ?? 'active',
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    clients: null,
  }));
}

export async function getDashboardMetricsByCompanyId(companyId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [
    allLeadsCountRows,
    activeLeadsCountRows,
    followupCountRows,
    convertedLeadsCountRows,
    activeSubscriptionsCountRows,
    invoiceRows,
    campaignRows,
  ] = await Promise.all([
    mysqlPool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM leads WHERE company_id = ?',
      [companyId]
    ),
    mysqlPool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND status NOT IN ('won', 'lost')",
      [companyId]
    ),
    mysqlPool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND follow_up_date <= ? AND status NOT IN ('won', 'lost')",
      [companyId, today]
    ),
    mysqlPool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND status = 'won'",
      [companyId]
    ),
    mysqlPool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM subscriptions WHERE company_id = ? AND status = 'active'",
      [companyId]
    ),
    mysqlPool.query<DashboardInvoiceRow[]>(
      'SELECT status, paid_amount, final_amount, balance_amount FROM invoices WHERE company_id = ?',
      [companyId]
    ),
    mysqlPool.query<DashboardCampaignRow[]>(
      'SELECT spent_amount FROM campaigns WHERE company_id = ? ORDER BY createdAt DESC',
      [companyId]
    ),
  ]);

  const totalLeads = Number(allLeadsCountRows[0][0]?.count ?? 0);
  const activeLeads = Number(activeLeadsCountRows[0][0]?.count ?? 0);
  const followupsToday = Number(followupCountRows[0][0]?.count ?? 0);
  const conversionsCount = Number(convertedLeadsCountRows[0][0]?.count ?? 0);
  const activeSubscriptions = Number(activeSubscriptionsCountRows[0][0]?.count ?? 0);
  const invoices = invoiceRows[0] ?? [];
  const campaigns = campaignRows[0] ?? [];

  const totalRevenue = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + toNumber(invoice.paid_amount), 0);

  const pendingAmount = invoices
    .filter((invoice) => invoice.status === 'pending')
    .reduce(
      (sum, invoice) =>
        sum + toNumber(invoice.balance_amount ?? invoice.final_amount),
      0
    );

  const overdueAmount = invoices
    .filter((invoice) => invoice.status === 'overdue')
    .reduce(
      (sum, invoice) =>
        sum + toNumber(invoice.balance_amount ?? invoice.final_amount),
      0
    );

  const campaignCost = campaigns.reduce(
    (sum, campaign) => sum + toNumber(campaign.spent_amount),
    0
  );

  const cpl = totalLeads > 0 && campaignCost > 0 ? campaignCost / totalLeads : 0;
  const roi = campaignCost > 0 ? totalRevenue / campaignCost : 0;
  const conversionRate = totalLeads > 0 ? (conversionsCount / totalLeads) * 100 : 0;

  return {
    totalLeads,
    activeLeads,
    followupsToday,
    overdueTasks: 0,
    activitiesThisWeek: 0,
    activeSubscriptions,
    totalRevenue,
    pendingAmount,
    overdueAmount,
    leadsCount: totalLeads,
    conversionsCount,
    campaignCost,
    cpl,
    roi,
    conversionRate,
    totalClients: 0,
    expiringSoon: 0,
    expiredSubscriptions: 0,
    clientRevenue: totalRevenue,
  };
}
