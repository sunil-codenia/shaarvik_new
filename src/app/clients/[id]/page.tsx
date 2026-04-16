'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Phone, Mail, MapPin, FileText, Calendar, Tag, Edit2, Trash2, Plus, Activity, Package, AlertTriangle, X, ChevronDown, PauseCircle, CheckCircle, XCircle, LifeBuoy, LayoutDashboard, CreditCard, CheckSquare } from 'lucide-react';
import Link from 'next/link';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  displayName: string | null;
  companyId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  billingEmail: string | null;
  status: string;
  source: string | null;
  createdAt: string;
}

interface Lead {
  id: string;
  fullName: string;
  status: string;
  dealValue: number | null;
  followUpDate: string | null;
}

interface Subscription {
  id: string;
  saasPlanId: string | null;
  planName: string;
  platformName: string;
  startDate: string | null;
  expiryDate: string | null;
  endDate: string | null;
  status: string;
  billingCycle: string;
  amount: number;
  amountPaid: number;
  paymentMode: string | null;
  notes: string | null;
}

interface SaasPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  platformName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sourceLabel: Record<string, string> = {
  reference: 'Reference',
  website: 'Website',
  ads: 'Ads',
  lead_conversion: 'Lead Conversion',
};

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-50 text-yellow-700' },
  qualified: { label: 'Qualified', color: 'bg-purple-50 text-purple-700' },
  proposal: { label: 'Proposal', color: 'bg-orange-50 text-orange-700' },
  won: { label: 'Won', color: 'bg-green-50 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-50 text-red-700' },
};

function getDaysUntilExpiry(dateStr: string | null): number {
  if (!dateStr) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr); expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-500 text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-words">{value || <span className="text-muted-foreground/40">—</span>}</p>
      </div>
    </div>
  );
}

function calcExpiryDate(startDate: string, billingCycle: string): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (billingCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else if (billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }
  return payload as T;
}

type TabId = 'overview' | 'subscriptions' | 'activity';

const emptySubForm = {
  saasPlanId: '',
  startDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  billingCycle: 'monthly',
  amount: 0,
  amountPaid: 0,
  paymentMode: 'online',
  status: 'active',
  notes: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Subscription form state
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState(emptySubForm);
  const [subSaving, setSubSaving] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [updatingSubId, setUpdatingSubId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const clientRes = await fetchJson<any>(`/api/mysql/clients/${encodeURIComponent(clientId)}`);
      const [leadsRes, subsRes, plansRes] = await Promise.all([
        fetchJson<any[]>(
          `/api/mysql/leads?clientId=${encodeURIComponent(clientId)}${clientRes.companyId ? `&companyId=${encodeURIComponent(clientRes.companyId)}` : ''}`
        ),
        fetchJson<any[]>(
          `/api/mysql/subscriptions?clientId=${encodeURIComponent(clientId)}${clientRes.companyId ? `&companyId=${encodeURIComponent(clientRes.companyId)}` : ''}`
        ),
        fetchJson<any[]>('/api/mysql/saas-plans'),
      ]);

      const d = clientRes;
      setClient({
        id: d.id,
        name: d.name || 'Unknown',
        displayName: d.displayName || d.display_name || null,
        companyId: d.companyId || d.company_id || null,
        phone: d.phone || null,
        email: d.email || null,
        address: d.address || null,
        gstNumber: d.gstNumber || d.gst_number || null,
        billingEmail: d.billingEmail || d.billing_email || null,
        status: d.status || 'active',
        source: d.source || null,
        createdAt: d.createdAt || d.created_at,
      });

      setLeads((leadsRes || []).map((l: any) => ({
        id: l.id,
        fullName: l.full_name || 'Unknown Lead',
        status: l.status || 'new',
        dealValue: l.deal_value ? Number(l.deal_value) : null,
        followUpDate: l.follow_up_date || null,
      })));

      setSubscriptions((subsRes || []).map((s: any) => ({
        id: s.id,
        saasPlanId: s.saas_plan_id || null,
        planName: s.saas_plans?.name || s.plan_name || '—',
        platformName: s.saas_plans?.saas_platforms?.name || s.platform_name || '—',
        startDate: s.start_date || null,
        expiryDate: s.expiry_date || null,
        endDate: s.end_date || null,
        status: s.status || 'active',
        billingCycle: s.billing_cycle || 'monthly',
        amount: Number(s.amount || 0),
        amountPaid: Number(s.amount_paid || 0),
        paymentMode: s.payment_mode || null,
        notes: s.notes || null,
      })));

      setSaasPlans((plansRes || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        billingCycle: p.billingCycle || p.billing_cycle || 'monthly',
        platformName: p.platformName || p.platform_name || '—',
      })));

    } catch (err: any) {
      setError(err?.message || 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-fill amount and billing cycle when plan is selected
  useEffect(() => {
    if (!subForm.saasPlanId) return;
    const plan = saasPlans.find(p => p.id === subForm.saasPlanId);
    if (plan) {
      setSubForm(f => ({ ...f, amount: plan.price, billingCycle: plan.billingCycle }));
    }
  }, [subForm.saasPlanId, saasPlans]);

  useEffect(() => {
    if (subForm.startDate && subForm.billingCycle) {
      setSubForm(f => ({ ...f, expiryDate: calcExpiryDate(f.startDate, f.billingCycle) }));
    }
  }, [subForm.startDate, subForm.billingCycle]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetchJson(`/api/mysql/clients/${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      router.push('/clients');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete client.');
      setDeleting(false);
    }
  };

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubSaving(true); setSubError(null);
    try {
      if (!subForm.saasPlanId) { setSubError('Please select a plan.'); setSubSaving(false); return; }
      if (subForm.expiryDate && new Date(subForm.expiryDate) <= new Date(subForm.startDate)) {
        setSubError('Expiry date must be after start date.'); setSubSaving(false); return;
      }
      const data = await fetchJson<any>('/api/mysql/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          companyId: client?.companyId || null,
          saasPlanId: subForm.saasPlanId,
          startDate: subForm.startDate,
          endDate: subForm.expiryDate || null,
          status: subForm.status,
          billingCycle: subForm.billingCycle,
          amount: subForm.amount,
          amountPaid: subForm.amountPaid,
          paymentMode: subForm.paymentMode,
          notes: subForm.notes || null,
        }),
      });

      const newSub: Subscription = {
        id: data.id,
        saasPlanId: subForm.saasPlanId || null,
        planName: saasPlans.find(p => p.id === subForm.saasPlanId)?.name || '—',
        platformName: saasPlans.find(p => p.id === subForm.saasPlanId)?.platformName || '—',
        startDate: subForm.startDate || null,
        expiryDate: subForm.expiryDate || null,
        endDate: subForm.expiryDate || null,
        status: subForm.status || 'active',
        billingCycle: subForm.billingCycle || 'monthly',
        amount: Number(subForm.amount || 0),
        amountPaid: Number(subForm.amountPaid || 0),
        paymentMode: subForm.paymentMode || null,
        notes: subForm.notes || null,
      };
      setSubscriptions(prev => [newSub, ...prev]);
      setShowSubModal(false);
      setSubForm(emptySubForm);
    } catch (err: any) {
      setSubError(err?.message || 'Failed to add subscription.');
    } finally { setSubSaving(false); }
  };

  const handleDeleteSubscription = async (subId: string) => {
    setDeletingSubId(subId);
    try {
      await fetchJson(`/api/mysql/subscriptions/${encodeURIComponent(subId)}`, { method: 'DELETE' });
      setSubscriptions(prev => prev.filter(s => s.id !== subId));
    } catch {}
    setDeletingSubId(null);
  };

  const handleSubStatusChange = async (subId: string, newStatus: string) => {
    setUpdatingSubId(subId);
    try {
      await fetchJson(`/api/mysql/subscriptions/${encodeURIComponent(subId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: newStatus } : s));
    } catch {}
    setUpdatingSubId(null);
  };

  // Computed alerts
  const expiredSubs = subscriptions.filter(s => s.status === 'expired' || (s.expiryDate && getDaysUntilExpiry(s.expiryDate) < 0));
  const expiringSoonSubs = subscriptions.filter(s => s.status === 'active' && s.expiryDate && getDaysUntilExpiry(s.expiryDate) >= 0 && getDaysUntilExpiry(s.expiryDate) <= 7);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={14} />, count: subscriptions.length },
    { id: 'activity', label: 'Leads', icon: <Activity size={14} />, count: leads.length },
  ];

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/clients')} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            {loading ? (
              <div className="h-6 bg-muted rounded w-40 animate-pulse" />
            ) : (
              <>
                <h1 className="text-2xl font-600 text-foreground">{client?.name || 'Client Details'}</h1>
                {client?.displayName && <p className="text-sm text-muted-foreground mt-0.5">{client.displayName}</p>}
              </>
            )}
          </div>
          {client && (
            <div className="flex items-center gap-2">
              <Link
                href={`/tickets/new?client_id=${clientId}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-border bg-card text-foreground hover:bg-muted transition-all"
              >
                <LifeBuoy size={14} /><span className="hidden sm:inline">Ticket</span>
              </Link>
              <Link href={`/clients/${clientId}/edit`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-border bg-card text-foreground hover:bg-muted transition-all">
                <Edit2 size={14} /><span className="hidden sm:inline">Edit</span>
              </Link>
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                <Trash2 size={14} /><span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card rounded-xl shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-base font-600 text-foreground mb-2">Delete Client?</h3>
              <p className="text-sm text-muted-foreground mb-5">This will permanently delete <strong>{client?.name}</strong> and all associated data. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-card text-foreground hover:bg-muted transition-all">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60">{deleting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Subscription Modal */}
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card rounded-xl shadow-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-600 text-foreground">Add Subscription</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Client: <span className="font-500 text-foreground">{client?.name}</span></p>
                </div>
                <button onClick={() => { setShowSubModal(false); setSubForm(emptySubForm); setSubError(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleAddSubscription} className="space-y-4">
                {/* SaaS Plan */}
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1.5">SaaS Plan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      required
                      value={subForm.saasPlanId}
                      onChange={e => setSubForm(f => ({ ...f, saasPlanId: e.target.value }))}
                      className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    >
                      <option value="">Select a plan</option>
                      {saasPlans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.platformName} — {p.name} (₹{p.price.toLocaleString('en-IN')} / {p.billingCycle})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Billing Cycle */}
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1">Billing Cycle</label>
                  <div className="relative">
                    <select value={subForm.billingCycle} onChange={e => setSubForm(f => ({ ...f, billingCycle: e.target.value }))} className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none appearance-none">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1">Start Date</label>
                  <input type="date" value={subForm.startDate} onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {/* Status */}
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1">Status</label>
                  <div className="relative">
                    <select value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none appearance-none">
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Amount / Payment Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Amount (₹)</label>
                    <input type="number" min="0" step="0.01" value={subForm.amount} onChange={e => setSubForm(f => ({ ...f, amount: Number(e.target.value) }))} className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Payment Mode</label>
                    <div className="relative">
                      <select value={subForm.paymentMode} onChange={e => setSubForm(f => ({ ...f, paymentMode: e.target.value }))} className="w-full px-2 py-1.5 pr-7 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none appearance-none">
                        <option value="online">Online</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="upi">UPI</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
                {/* Notes */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                  <textarea value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Optional notes..." />
                </div>
                {subError && <p className="text-xs text-red-500">{subError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowSubModal(false); setSubForm(emptySubForm); setSubError(null); }} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-card text-foreground hover:bg-muted transition-all">Cancel</button>
                  <button type="submit" disabled={subSaving} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">{subSaving ? 'Saving...' : 'Add Subscription'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-14 h-14 rounded-full bg-muted" />
              <div className="space-y-2"><div className="h-5 bg-muted rounded w-40" /><div className="h-3.5 bg-muted rounded w-24" /></div>
            </div>
            {[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3 py-2"><div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" /><div className="flex-1 space-y-1.5"><div className="h-3 bg-muted rounded w-16" /><div className="h-3.5 bg-muted rounded w-48" /></div></div>)}
          </div>
        )}

        {!loading && error && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button onClick={() => router.push('/clients')} className="text-sm text-primary hover:underline">Back to Clients</button>
          </div>
        )}

        {!loading && !error && client && (
          <div className="space-y-5">
            {/* Alerts */}
            {(expiredSubs.length > 0 || expiringSoonSubs.length > 0) && (
              <div className="space-y-2">
                {expiredSubs.length > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div><p className="text-sm font-600 text-red-700">Expired Subscriptions</p><p className="text-xs text-red-600 mt-0.5">{expiredSubs.map(s => `${s.platformName} — ${s.planName}`).join(', ')} — Please renew.</p></div>
                  </div>
                )}
                {expiringSoonSubs.length > 0 && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div><p className="text-sm font-600 text-amber-700">Expiring Soon</p><p className="text-xs text-amber-600 mt-0.5">{expiringSoonSubs.map(s => `${s.platformName} — ${s.planName} (${getDaysUntilExpiry(s.expiryDate)}d left)`).join(', ')}</p></div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="flex border-b border-border overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-500 whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-600 ${
                        activeTab === tab.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex items-center gap-4 pb-5 mb-2 border-b border-border">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-700 text-primary">{client.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-600 text-foreground truncate">{client.name}</h2>
                        {client.displayName && <p className="text-sm text-muted-foreground truncate">{client.displayName}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 ${client.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {client.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                          {client.source && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 bg-muted text-muted-foreground">
                              {sourceLabel[client.source] || client.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <InfoRow icon={<Mail size={14} className="text-muted-foreground" />} label="Email" value={client.email} />
                    <InfoRow icon={<Phone size={14} className="text-muted-foreground" />} label="Phone" value={client.phone} />
                    <InfoRow icon={<Building2 size={14} className="text-muted-foreground" />} label="Company / Display Name" value={client.displayName} />
                    <InfoRow icon={<MapPin size={14} className="text-muted-foreground" />} label="Address" value={client.address} />
                    <InfoRow icon={<FileText size={14} className="text-muted-foreground" />} label="GST Number" value={client.gstNumber} />
                    <InfoRow icon={<Mail size={14} className="text-muted-foreground" />} label="Billing Email" value={client.billingEmail} />
                    <InfoRow icon={<Tag size={14} className="text-muted-foreground" />} label="Source" value={sourceLabel[client.source || ''] || client.source} />
                    <InfoRow icon={<Calendar size={14} className="text-muted-foreground" />} label="Created" value={fmtDate(client.createdAt)} />
                  </div>
                </div>
              )}

              {/* ── SUBSCRIPTIONS TAB ── */}
              {activeTab === 'subscriptions' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-600 text-foreground">Subscriptions</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''} for {client.name}</p>
                    </div>
                    <button
                      onClick={() => setShowSubModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 bg-primary text-white hover:bg-primary/90 transition-all"
                    >
                      <Plus size={14} /> Add Subscription
                    </button>
                  </div>

                  {subscriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Package size={22} className="text-primary" />
                      </div>
                      <p className="text-sm font-500 text-foreground mb-1">No subscriptions yet</p>
                      <p className="text-xs text-muted-foreground mb-4">Add a subscription to get started.</p>
                      <button onClick={() => setShowSubModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-500 bg-primary text-white hover:bg-primary/90 transition-all">
                        <Plus size={14} /> Add Subscription
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border">
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Platform</th>
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Plan</th>
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Start</th>
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Expiry</th>
                            <th className="text-right px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Amount</th>
                            <th className="text-right px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Paid</th>
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {subscriptions.map(sub => {
                            const daysLeft = getDaysUntilExpiry(sub.expiryDate);
                            const isExpired = sub.status === 'expired' || (sub.expiryDate && daysLeft < 0);
                            const isExpiringSoon = !isExpired && sub.status === 'active' && sub.expiryDate && daysLeft <= 7;
                            const isSuspended = sub.status === 'suspended';
                            return (
                              <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 text-sm text-foreground">{sub.platformName}</td>
                                <td className="px-4 py-3">
                                  <div>
                                    <span className="font-500 text-foreground">{sub.planName}</span>
                                    <span className="block text-xs text-muted-foreground capitalize">{sub.billingCycle}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{fmtDate(sub.startDate)}</td>
                                <td className="px-4 py-3 text-sm whitespace-nowrap">
                                  <span className={isExpired ? 'text-red-600 font-500' : isExpiringSoon ? 'text-amber-600 font-500' : 'text-muted-foreground'}>
                                    {fmtDate(sub.expiryDate)}
                                  </span>
                                  {!isExpired && sub.status === 'active' && sub.expiryDate && (
                                    <span className={`block text-xs ${isExpiringSoon ? 'text-amber-500' : 'text-muted-foreground/60'}`}>{daysLeft}d left</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-500 text-foreground whitespace-nowrap">{fmtCurrency(sub.amount)}</td>
                                <td className="px-4 py-3 text-right text-sm text-green-600 font-500 whitespace-nowrap">{fmtCurrency(sub.amountPaid)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 ${isExpired ? 'bg-red-50 text-red-600' : isSuspended ? 'bg-amber-50 text-amber-700' : isExpiringSoon ? 'bg-amber-50 text-amber-700' : sub.status === 'trial' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                    {isExpired ? <XCircle size={10} /> : isSuspended ? <PauseCircle size={10} /> : <CheckCircle size={10} />}
                                    {isExpired ? 'Expired' : isSuspended ? 'Suspended' : isExpiringSoon ? 'Expiring Soon' : sub.status === 'trial' ? 'Trial' : 'Active'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {sub.status === 'active' && <button onClick={() => handleSubStatusChange(sub.id, 'suspended')} disabled={updatingSubId === sub.id} className="px-2 py-0.5 text-[10px] rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50">Suspend</button>}
                                    {sub.status === 'suspended' && <button onClick={() => handleSubStatusChange(sub.id, 'active')} disabled={updatingSubId === sub.id} className="px-2 py-0.5 text-[10px] rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">Activate</button>}
                                    <button onClick={() => handleDeleteSubscription(sub.id)} disabled={deletingSubId === sub.id} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── LEADS TAB ── */}
              {activeTab === 'activity' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-600 text-foreground">Associated Leads</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} converted to this client</p>
                    </div>
                    <Link href={`/leads/add?client_id=${clientId}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 bg-primary text-white hover:bg-primary/90 transition-all">
                      <Plus size={14} /> Add Lead
                    </Link>
                  </div>

                  {leads.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <CheckSquare size={22} className="text-primary" />
                      </div>
                      <p className="text-sm font-500 text-foreground mb-1">No leads linked</p>
                      <p className="text-xs text-muted-foreground">Leads converted to this client will appear here.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {leads.map(lead => {
                        const sc = leadStatusConfig[lead.status] || { label: lead.status, color: 'bg-gray-50 text-gray-600' };
                        return (
                          <li key={lead.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <Link href={`/leads/${lead.id}`} className="text-sm font-500 text-foreground hover:text-primary truncate block">{lead.fullName}</Link>
                              {lead.followUpDate && <p className="text-xs text-muted-foreground mt-0.5">Follow-up: {fmtDate(lead.followUpDate)}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {lead.dealValue !== null && <span className="text-xs font-500 text-muted-foreground">₹{lead.dealValue.toLocaleString('en-IN')}</span>}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>{sc.label}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
