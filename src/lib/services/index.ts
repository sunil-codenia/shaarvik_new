/**
 * Centralized Service Layer
 * Single data-fetch layer for all modules — no duplicate queries, no redundant API calls.
 * All queries are company-scoped and user-authenticated via Supabase RLS.
 * 
 * ALLOWED TABLES: companies, leads, campaigns, products, subscriptions, invoices
 * (plus supporting: user_profiles, tasks, activities, projects, support_tickets)
 */

import debug from '@/lib/debug';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  company_id: string | null;
  email: string | null;
}

export interface DashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  followupsToday: number;
  overdueTasks: number;
  activitiesThisWeek: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  leadsCount: number;
  conversionsCount: number;
  campaignCost: number;
  cpl: number;
  roi: number;
  conversionRate: number;
  // Legacy compat fields
  totalClients: number;
  expiringSoon: number;
  expiredSubscriptions: number;
  clientRevenue: number;
}

async function fetchInternalJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Get the current authenticated user. Returns null if not logged in.
 */
export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to load current user.');
    }

    const data = await response.json();
    return data?.user ?? null;
  } catch (error) {
    debug.dbError('auth', 'SELECT', 'mysql.session', error);
    return null;
  }
}

/**
 * Get the current user's profile including company_id.
 * Cached per session — avoids repeated profile lookups across modules.
 */
let _profileCache: { userId: string; profile: UserProfile } | null = null;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (_profileCache?.userId === userId) return _profileCache.profile;

  debug.dbRequest('profile', 'SELECT', 'profiles:mysql', { userId });

  try {
    const data = await fetchInternalJson<UserProfile | { error: string }>(
      `/api/mysql/profile/${encodeURIComponent(userId)}`
    );

    if (data && !(data as any).error) {
      _profileCache = { userId, profile: data as UserProfile };
      debug.dbSuccess('profile', 'SELECT', 'profiles:mysql', data);
      return data as UserProfile;
    }
  } catch (error) {
    debug.dbError('profile', 'SELECT', 'profiles:mysql', error);
  }

  return null;
}

/**
 * Invalidate the profile cache (call after profile updates).
 */
export function invalidateProfileCache() {
  _profileCache = null;
}

/**
 * Get current user + company_id in one call.
 * Use this at the top of every module's data fetch.
 */
export async function getAuthContext(): Promise<{ userId: string; companyId: string | null } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getUserProfile(user.id);
  return { userId: user.id, companyId: profile?.company_id ?? null };
}

// ─── Leads Service ────────────────────────────────────────────────────────────

export async function fetchLeads(companyId: string) {
  debug.dbRequest('leads', 'SELECT', 'leads:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/leads?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('leads', 'SELECT', 'leads:mysql', { count: data?.length });
  return data || [];
}

export async function createLead(payload: Record<string, unknown>) {
  debug.dbRequest('leads', 'INSERT', 'leads:mysql', payload);
  const response = await fetch('/api/mysql/leads', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create lead.');
  }

  const data = await response.json();
  debug.dbSuccess('leads', 'INSERT', 'leads:mysql', data);
  return data;
}

export async function updateLead(id: string, payload: Record<string, unknown>) {
  // Placeholder for MySQL update API if needed
  console.warn('updateLead: MySQL direct update not implemented yet.', { id, payload });
  return null;
}

export async function deleteLead(id: string) {
  // Placeholder for MySQL delete API if needed
  console.warn('deleteLead: MySQL direct delete not implemented yet.', { id });
}


// ─── Tasks Service ────────────────────────────────────────────────────────────

export async function fetchTasks(companyId: string) {
  debug.dbRequest('tasks', 'SELECT', 'tasks:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/tasks?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('tasks', 'SELECT', 'tasks:mysql', { count: data?.length });
  return data || [];
}

export async function updateTaskStatus(id: string, status: string) {
  console.warn('updateTaskStatus: MySQL direct update not implemented yet.', { id, status });
  return null;
}

export async function deleteTask(id: string) {
  console.warn('deleteTask: MySQL direct delete not implemented yet.', { id });
}

// ─── Projects Service ─────────────────────────────────────────────────────────

export async function fetchProjects(companyId: string) {
  debug.dbRequest('projects', 'SELECT', 'projects:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/projects?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('projects', 'SELECT', 'projects:mysql', { count: data?.length });
  return data || [];
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  debug.dbRequest('projects', 'DELETE', 'projects', { id });
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) { debug.dbError('projects', 'DELETE', 'projects', error); throw error; }
  debug.dbSuccess('projects', 'DELETE', 'projects', { id });
}

// ─── Activities Service ───────────────────────────────────────────────────────

export async function fetchActivities(companyId: string, limit = 100) {
  debug.dbRequest('activities', 'SELECT', 'activities:mysql', { companyId, limit });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/activities?companyId=${encodeURIComponent(companyId)}&limit=${limit}`
  );
  debug.dbSuccess('activities', 'SELECT', 'activities:mysql', { count: data?.length });
  return data || [];
}

// ─── Campaigns Service ────────────────────────────────────────────────────────

export async function fetchCampaigns(companyId: string) {
  debug.dbRequest('campaigns', 'SELECT', 'campaigns:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/campaigns?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('campaigns', 'SELECT', 'campaigns:mysql', { count: data?.length });
  return data || [];
}

export async function createCampaign(payload: Record<string, unknown>) {
  console.warn('createCampaign: MySQL direct create not implemented yet.', { payload });
  return null;
}

export async function updateCampaign(id: string, payload: Record<string, unknown>) {
  console.warn('updateCampaign: MySQL direct update not implemented yet.', { id, payload });
  return null;
}

export async function deleteCampaign(id: string) {
  console.warn('deleteCampaign: MySQL direct delete not implemented yet.', { id });
}

// ─── Products Service ─────────────────────────────────────────────────────────

export async function fetchProducts() {
  debug.dbRequest('products', 'SELECT', 'products:mysql', {});
  const data = await fetchInternalJson<any[]>(`/api/mysql/products`);
  debug.dbSuccess('products', 'SELECT', 'products:mysql', { count: data?.length });
  return data || [];
}

// ─── Subscriptions Service (uses subscriptions table, company-scoped) ─────────

export async function fetchSubscriptions(companyId: string) {
  debug.dbRequest('subscriptions', 'SELECT', 'subscriptions:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/subscriptions?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('subscriptions', 'SELECT', 'subscriptions:mysql', { count: data?.length });
  return data || [];
}

export async function createSubscription(payload: Record<string, unknown>) {
  console.warn('createSubscription: MySQL direct create not implemented yet.', { payload });
  return null;
}

export async function updateSubscription(id: string, payload: Record<string, unknown>) {
  console.warn('updateSubscription: MySQL direct update not implemented yet.', { id, payload });
  return null;
}

export async function deleteSubscription(id: string) {
  console.warn('deleteSubscription: MySQL direct delete not implemented yet.', { id });
}

// ─── Invoices Service ─────────────────────────────────────────────────────────

export async function fetchInvoices(companyId: string) {
  debug.dbRequest('invoices', 'SELECT', 'invoices:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/invoices?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('invoices', 'SELECT', 'invoices:mysql', { count: data?.length });
  return data || [];
}

export async function createInvoice(payload: Record<string, unknown>) {
  console.warn('createInvoice: MySQL direct create not implemented yet.', { payload });
  return null;
}

// ─── Support Tickets Service ──────────────────────────────────────────────────

export async function fetchTickets(companyId: string) {
  debug.dbRequest('tickets', 'SELECT', 'support_tickets:mysql', { companyId });
  const data = await fetchInternalJson<any[]>(
    `/api/mysql/support_tickets?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('tickets', 'SELECT', 'support_tickets:mysql', { count: data?.length });
  return data || [];
}

// ─── Dashboard Aggregation ────────────────────────────────────────────────────
// Uses ONLY: leads, invoices, campaigns, subscriptions (company-scoped)

export async function fetchDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
  debug.dbRequest('dashboard', 'SELECT', 'all_modules:mysql', { companyId });
  const data = await fetchInternalJson<DashboardMetrics>(
    `/api/mysql/dashboard?companyId=${encodeURIComponent(companyId)}`
  );
  debug.dbSuccess('dashboard', 'SELECT', 'all_modules:mysql', {
    companyId,
    leadsCount: data.leadsCount,
    conversionsCount: data.conversionsCount,
    totalRevenue: data.totalRevenue,
  });
  return data;
}

function fetchClients(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: fetchClients is not implemented yet.', args);
  return null;
}

export { fetchClients };
