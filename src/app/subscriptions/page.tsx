'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, CheckCircle, Clock, Ban, ChevronDown, X, Trash2, DollarSign, Package, Filter, Bell, BellOff, Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCompanyId } from '@/hooks/useCompanyId';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string | null;
  email: string | null;
  display_name: string | null;
  companyId: string | null;
}

interface SaasPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  platform_name: string;
}

interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  saasPlanId: string | null;
  planName: string | null;
  platformName: string | null;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  paymentMode: string;
  amount: number;
  amountPaid: number;
  notes: string | null;
  createdAt: string;
}

interface SubscriptionForm {
  clientId: string;
  saasPlanId: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentMode: 'online' | 'bank_transfer' | 'cash' | 'cheque' | 'upi';
  amount: string;
  amountPaid: string;
  notes: string;
}

interface RenewalReminder {
  id: string;
  subscription_id: string;
  remind_on: string;
  status: string;
  email_status: string;
  sms_status: string;
  notif_status: string;
  email_error: string | null;
  sms_error: string | null;
  sent_at: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active:    { label: 'Active',    color: 'bg-green-50 text-green-700 border-green-200',  icon: <CheckCircle size={11} /> },
  expired:   { label: 'Expired',   color: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock size={11} /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-200',        icon: <Ban size={11} /> },
};

const REMINDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  sent:     { label: 'Sent',      color: 'bg-green-50 text-green-700 border-green-200' },
  failed:   { label: 'Failed',    color: 'bg-red-50 text-red-600 border-red-200' },
  skipped:  { label: 'Skipped',   color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const CHANNEL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'text-blue-600' },
  sent:     { label: 'Sent',     color: 'text-green-600' },
  failed:   { label: 'Failed',   color: 'text-red-500' },
  skipped:  { label: 'Skipped',  color: 'text-gray-400' },
};

const BILLING_CYCLES = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

const PAYMENT_MODES = [
  { value: 'online',        label: 'Online' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'upi',           label: 'UPI' },
];


const EMPTY_FORM: SubscriptionForm = {
  clientId: '',
  saasPlanId: '',
  billingCycle: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  status: 'active',
  paymentMode: 'online',
  amount: '',
  amountPaid: '',
  notes: '',
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEndDate(startDate: string, cycle: string): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (cycle === 'monthly')   d.setMonth(d.getMonth() + 1);
  if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  if (cycle === 'yearly')    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtBillingCycle(cycle: string): string {
  if (!cycle) return '—';
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.expired;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 border ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Reminders Panel ──────────────────────────────────────────────────────────

function RemindersPanel({
  subscriptionId,
  companyId,
  clientId,
  endDate,
  clientName,
}: {
  subscriptionId: string;
  companyId: string;
  clientId: string;
  endDate: string | null;
  clientName: string;
}) {
  const [reminders, setReminders] = useState<RenewalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [firing, setFiring] = useState(false);
  const { success, error: toastError } = useToast();

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders/process?subscriptionId=${subscriptionId}`);
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const handleSchedule = async () => {
    if (!endDate) { toastError('Subscription has no end date — set one first.'); return; }
    setScheduling(true);
    try {
      const res = await fetch('/api/reminders/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, companyId, clientId, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule');
      success('Reminder scheduled for 30 days before expiry.');
      await loadReminders();
    } catch (err: any) {
      toastError(err.message || 'Failed to schedule reminder.');
    } finally {
      setScheduling(false);
    }
  };

  const handleFireNow = async () => {
    if (!confirm('Send this reminder now? This will attempt to send email, SMS, and create an internal notification.')) return;
    setFiring(true);
    try {
      const res = await fetch('/api/reminders/process', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process');
      success(`Processed ${data.processed} reminder(s).`);
      await loadReminders();
    } catch (err: any) {
      toastError(err.message || 'Failed to fire reminders.');
    } finally {
      setFiring(false);
    }
  };

  const remindOn = endDate
    ? (() => {
        const d = new Date(endDate);
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })()
    : null;

  const daysLeft = endDate ? daysUntil(endDate) : null;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
        <Bell size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-600 mb-0.5">Auto-Renewal Reminder</p>
          <p>
            A reminder will be sent <strong>30 days before expiry</strong> via email (Resend) and SMS (Twilio) to {clientName}, plus an internal notification to the assigned relationship manager.
            {!endDate && <span className="text-amber-700 font-500"> Set an end date on this subscription to enable reminders.</span>}
          </p>
          {endDate && remindOn && (
            <p className="mt-1">
              Scheduled reminder date: <strong>{fmtDate(remindOn)}</strong>
              {daysLeft !== null && (
                <span className={`ml-2 font-500 ${daysLeft <= 30 ? 'text-amber-700' : 'text-blue-700'}`}>
                  ({daysLeft > 0 ? `${daysLeft} days until expiry` : 'Expired'})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSchedule}
          disabled={scheduling || !endDate}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-500 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scheduling ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
          {scheduling ? 'Scheduling…' : 'Schedule Reminder'}
        </button>
        {reminders.some(r => r.status === 'pending') && (
          <button
            onClick={handleFireNow}
            disabled={firing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-500 rounded-lg border border-border bg-white text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {firing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            {firing ? 'Sending…' : 'Send Now'}
          </button>
        )}
        <button
          onClick={loadReminders}
          className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Reminders list */}
      {loading ? (
        <div className="text-xs text-muted-foreground py-2">Loading reminders…</div>
      ) : reminders.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <BellOff size={14} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No reminders scheduled yet. Click "Schedule Reminder" to set one up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map(r => {
            const rCfg = REMINDER_STATUS_CONFIG[r.status] || REMINDER_STATUS_CONFIG.pending;
            return (
              <div key={r.id} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${rCfg.color}`}>
                        {rCfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Scheduled: <strong>{fmtDate(r.remind_on)}</strong>
                      </span>
                      {r.sent_at && (
                        <span className="text-xs text-muted-foreground">
                          · Sent: {fmtDate(r.sent_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Email:</span>
                        <span className={CHANNEL_STATUS_CONFIG[r.email_status]?.color || 'text-gray-500'}>
                          {CHANNEL_STATUS_CONFIG[r.email_status]?.label || r.email_status}
                        </span>
                        {r.email_error && (
                          <span title={r.email_error} className="cursor-help">
                            <AlertCircle size={11} className="text-amber-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">SMS:</span>
                        <span className={CHANNEL_STATUS_CONFIG[r.sms_status]?.color || 'text-gray-500'}>
                          {CHANNEL_STATUS_CONFIG[r.sms_status]?.label || r.sms_status}
                        </span>
                        {r.sms_error && (
                          <span title={r.sms_error} className="cursor-help">
                            <AlertCircle size={11} className="text-amber-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Notification:</span>
                        <span className={CHANNEL_STATUS_CONFIG[r.notif_status]?.color || 'text-gray-500'}>
                          {CHANNEL_STATUS_CONFIG[r.notif_status]?.label || r.notif_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const { success, error: toastError } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reminders panel state
  const [reminderSubId, setReminderSubId] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, clientsRes, plansRes] = await Promise.all([
        fetchJson<any[]>('/api/mysql/subscriptions'),
        fetchJson<any[]>('/api/mysql/clients'),
        fetchJson<any[]>('/api/mysql/saas-plans'),
      ]);

      setSubscriptions((subsRes || []).map((s: any) => ({
        id: s.id,
        clientId: s.client_id || '',
        clientName: s.client_display_name || s.client_name || s.company_name || 'Unknown Client',
        clientEmail: s.client_email || s.company_email || null,
        saasPlanId: s.saas_plan_id || null,
        planName: s.saas_plans?.name || s.plan_name || null,
        platformName: s.saas_plans?.saas_platforms?.name || s.platform_name || null,
        billingCycle: s.billing_cycle || 'monthly',
        startDate: s.start_date || null,
        endDate: s.end_date || null,
        status: s.status || 'active',
        paymentMode: s.payment_mode || 'online',
        amount: Number(s.amount || 0),
        amountPaid: Number(s.amount_paid || 0),
        notes: s.notes || null,
        createdAt: s.created_at || s.createdAt,
      })));

      setClients((clientsRes || []).map((c: any) => ({
        id: c.id,
        name: c.name || null,
        email: c.email || null,
        display_name: c.display_name || c.displayName || null,
        companyId: c.company_id ? String(c.company_id) : c.companyId || null,
      })));
      setPlans((plansRes || []).filter((p: any) => p.isActive !== false).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        billing_cycle: p.billingCycle || p.billing_cycle || 'monthly',
        platform_name: p.platformName || p.platform_name || '',
      })));
    } catch (err: any) {
      toastError(err?.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (profileLoading) return;
    loadData();
  }, [profileLoading, loadData]);

  // ── Plan auto-fill ─────────────────────────────────────────────────────────

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const cycle = plan.billing_cycle as SubscriptionForm['billingCycle'];
      const end = calcEndDate(form.startDate, cycle);
      setForm(f => ({
        ...f,
        saasPlanId: planId,
        billingCycle: cycle,
        amount: String(plan.price),
        amountPaid: String(plan.price),
        endDate: end,
      }));
    } else {
      setForm(f => ({ ...f, saasPlanId: planId }));
    }
  };

  const handleCycleChange = (cycle: SubscriptionForm['billingCycle']) => {
    const end = calcEndDate(form.startDate, cycle);
    setForm(f => ({ ...f, billingCycle: cycle, endDate: end }));
  };

  const handleStartDateChange = (date: string) => {
    const end = calcEndDate(date, form.billingCycle);
    setForm(f => ({ ...f, startDate: date, endDate: end }));
  };

  // ── Open modal ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setForm({
      clientId: sub.clientId,
      saasPlanId: sub.saasPlanId || '',
      billingCycle: sub.billingCycle as SubscriptionForm['billingCycle'],
      startDate: sub.startDate || '',
      endDate: sub.endDate || '',
      status: sub.status as SubscriptionForm['status'],
      paymentMode: sub.paymentMode as SubscriptionForm['paymentMode'],
      amount: String(sub.amount),
      amountPaid: String(sub.amountPaid),
      notes: sub.notes || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setFormError(null);
    if (!form.clientId) { setFormError('Please select a client.'); return; }
    if (!form.startDate) { setFormError('Please set a start date.'); return; }

    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId,
        companyId: clients.find(c => c.id === form.clientId)?.companyId || companyId || null,
        saasPlanId: form.saasPlanId || null,
        billingCycle: form.billingCycle,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        paymentMode: form.paymentMode,
        amount: parseFloat(form.amount) || 0,
        amountPaid: parseFloat(form.amountPaid) || 0,
        notes: form.notes || null,
      };

      if (editingId) {
        await fetchJson(`/api/mysql/subscriptions/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        success('Subscription updated.');
      } else {
        const newSub = await fetchJson<{ id: string }>('/api/mysql/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // Auto-schedule reminder if end date is set
        const selectedCompanyId = clients.find(c => c.id === form.clientId)?.companyId || companyId;
        if (form.endDate && newSub?.id && selectedCompanyId && form.clientId) {
          await fetch('/api/reminders/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId: newSub.id,
              companyId: selectedCompanyId,
              clientId: form.clientId,
              endDate: form.endDate,
            }),
          }).catch(() => {/* non-blocking */});
        }
        success('Subscription created. Renewal reminder auto-scheduled.');
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save subscription.');
    } finally {
      setSaving(false);
    }
  };

  // ── Status change ──────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetchJson(`/api/mysql/subscriptions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      success('Status updated.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status.');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetchJson(`/api/mysql/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      if (reminderSubId === id) setReminderSubId(null);
      success('Subscription deleted.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete subscription.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = subscriptions.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      s.clientName.toLowerCase().includes(q) ||
      (s.clientEmail || '').toLowerCase().includes(q) ||
      (s.planName || '').toLowerCase().includes(q) ||
      (s.platformName || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive    = subscriptions.filter(s => s.status === 'active').length;
  const totalExpired   = subscriptions.filter(s => s.status === 'expired').length;
  const totalCancelled = subscriptions.filter(s => s.status === 'cancelled').length;
  const totalRevenue   = subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amountPaid, 0);

  const reminderSub = reminderSubId ? subscriptions.find(s => s.id === reminderSubId) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-600 text-foreground">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage client subscriptions, billing cycles, and payment records</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Subscription</span>
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-xs font-500 text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-700 text-green-700">{totalActive}</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-amber-600" />
              <span className="text-xs font-500 text-muted-foreground">Expired</span>
            </div>
            <p className="text-2xl font-700 text-amber-700">{totalExpired}</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Ban size={14} className="text-red-500" />
              <span className="text-xs font-500 text-muted-foreground">Cancelled</span>
            </div>
            <p className="text-2xl font-700 text-red-600">{totalCancelled}</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-primary" />
              <span className="text-xs font-500 text-muted-foreground">Active Revenue</span>
            </div>
            <p className="text-xl font-700 text-primary">{fmtCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* Reminders Panel (inline, shown when a subscription is selected) */}
        {reminderSub && (
          <div className="bg-white border border-border rounded-xl shadow-sm mb-6">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-primary" />
                <span className="text-sm font-600 text-foreground">Renewal Reminders</span>
                <span className="text-xs text-muted-foreground">— {reminderSub.clientName}</span>
              </div>
              <button
                onClick={() => setReminderSubId(null)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <RemindersPanel
                subscriptionId={reminderSub.id}
                companyId={companyId || ''}
                clientId={reminderSub.clientId}
                endDate={reminderSub.endDate}
                clientName={reminderSub.clientName}
              />
            </div>
          </div>
        )}

        {/* Filters + Table */}
        <div className="bg-white border border-border rounded-xl shadow-sm">
          {/* Filter bar */}
          <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by client, plan, platform..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-foreground"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-white text-muted-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-primary/50" />
                Loading subscriptions…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Package size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-500 text-muted-foreground">No subscriptions found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Click "New Subscription" to get started'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Client', 'Plan', 'Start Date', 'Billing Cycle', 'End Date', 'Status', 'Amount', 'Reminder', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(s => {
                    const daysLeft = daysUntil(s.endDate);
                    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-500 text-foreground">{s.clientName}</p>
                          <p className="text-xs text-muted-foreground">{s.clientEmail || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.platformName ? <span className="text-xs text-muted-foreground/70">{s.platformName} · </span> : ''}
                          {s.planName || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {fmtDate(s.startDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${
                            s.billingCycle === 'yearly' ? 'bg-green-50 text-green-700 border-green-200' :
                            s.billingCycle === 'quarterly' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {fmtBillingCycle(s.billingCycle)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={isExpiringSoon ? 'text-amber-600 font-500' : 'text-muted-foreground'}>
                            {fmtDate(s.endDate)}
                          </span>
                          {isExpiringSoon && (
                            <p className="text-xs text-amber-500 mt-0.5">{daysLeft}d left</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-foreground font-500">{fmtCurrency(s.amount)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setReminderSubId(reminderSubId === s.id ? null : s.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-500 rounded-lg border transition-colors ${
                              reminderSubId === s.id
                                ? 'border-primary bg-primary/10 text-primary' :'border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/40'
                            }`}
                            title="Manage renewal reminder"
                          >
                            <Bell size={11} />
                            Reminder
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={s.status}
                              onChange={e => handleStatusChange(s.id, e.target.value)}
                              className="text-xs border border-border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              <option value="active">Active</option>
                              <option value="expired">Expired</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              onClick={() => handleDelete(s.id)}
                              disabled={deletingId === s.id}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Showing {filtered.length} of {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-600 text-foreground">
                  {editingId ? 'Edit Subscription' : 'New Subscription'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingId ? 'Update subscription details' : 'Create a subscription record for a client'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{formError}</div>
              )}

              {/* Auto-reminder notice */}
              {!editingId && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Bell size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    A renewal reminder will be auto-scheduled 30 days before the end date (email + SMS + notification).
                    Configure Resend and Twilio keys in <strong>Settings → API Keys</strong> to activate delivery.
                  </p>
                </div>
              )}

              {/* Client */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Client <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.clientId}
                    onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none text-foreground"
                  >
                    <option value="">Select a client…</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || c.name || c.email || c.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Plan (optional)
                </label>
                <div className="relative">
                  <select
                    value={form.saasPlanId}
                    onChange={e => handlePlanChange(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none text-foreground"
                  >
                    <option value="">No plan selected</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.platform_name ? `${p.platform_name} — ` : ''}{p.name} (₹{p.price.toLocaleString('en-IN')} / {p.billing_cycle})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Billing Cycle */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Billing Cycle
                </label>
                <div className="flex gap-2 flex-wrap">
                  {BILLING_CYCLES.map(c => (
                    <label
                      key={c.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm font-500 ${
                        form.billingCycle === c.value
                          ? 'border-primary bg-primary/5 text-primary' :'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="billingCycle"
                        value={c.value}
                        checked={form.billingCycle === c.value}
                        onChange={() => handleCycleChange(c.value as SubscriptionForm['billingCycle'])}
                        className="sr-only"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Start / End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  />
                </div>
              </div>

              {/* Amount / Amount Paid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amountPaid}
                    onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Payment Mode
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_MODES.map(m => (
                    <label
                      key={m.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm font-500 ${
                        form.paymentMode === m.value
                          ? 'border-primary bg-primary/5 text-primary' :'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        value={m.value}
                        checked={form.paymentMode === m.value}
                        onChange={() => setForm(f => ({ ...f, paymentMode: m.value as SubscriptionForm['paymentMode'] }))}
                        className="sr-only"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Status
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm font-500 ${
                        form.status === key
                          ? 'border-primary bg-primary/5 text-primary' :'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={key}
                        checked={form.status === key}
                        onChange={() => setForm(f => ({ ...f, status: key as SubscriptionForm['status'] }))}
                        className="sr-only"
                      />
                      {cfg.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes about this subscription…"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-lg font-500 hover:bg-primary/90 transition-all disabled:opacity-60"
              >
                {saving ? (
                  <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                ) : (
                  <>{editingId ? 'Update' : 'Create'} Subscription</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
