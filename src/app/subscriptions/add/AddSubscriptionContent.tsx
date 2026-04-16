'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useToast } from '@/components/ui/Toast';

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
  description: string | null;
  platform_name: string;
}

function calcEndDate(startDate: string, cycle: string): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (cycle === 'monthly')   d.setMonth(d.getMonth() + 1);
  if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  if (cycle === 'yearly')    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
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

export default function AddSubscriptionContent() {
  const router = useRouter();
  const { companyId, loading: profileLoading } = useCompanyId();
  const { success, error: toastError } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    clientId: '',
    saasPlanId: '',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: today,
    endDate: calcEndDate(today, 'monthly'),
    status: 'active',
    paymentMode: 'online',
    amount: '',
    amountPaid: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, plansRes] = await Promise.all([
        fetchJson<any[]>('/api/mysql/clients'),
        fetchJson<any[]>('/api/mysql/saas-plans'),
      ]);
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
        description: p.description || null,
        platform_name: p.platformName || p.platform_name || '',
      })));
    } catch (err: any) {
      toastError('Failed to load data: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (profileLoading) return;
    loadData();
  }, [profileLoading, loadData]);

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const cycle = plan.billing_cycle as 'monthly' | 'quarterly' | 'yearly';
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

  const handleCycleChange = (cycle: 'monthly' | 'quarterly' | 'yearly') => {
    const end = calcEndDate(form.startDate, cycle);
    setForm(f => ({ ...f, billingCycle: cycle, endDate: end }));
  };

  const handleStartDateChange = (date: string) => {
    const end = calcEndDate(date, form.billingCycle);
    setForm(f => ({ ...f, startDate: date, endDate: end }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.clientId) { setError('Please select a client.'); return; }
    if (!form.startDate) { setError('Please set a start date.'); return; }

    setSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === form.clientId);
      const newSub = await fetchJson<{ id: string }>('/api/mysql/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedClient?.companyId || companyId || null,
          clientId: form.clientId,
          saasPlanId: form.saasPlanId || null,
          billingCycle: form.billingCycle,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          status: form.status,
          paymentMode: form.paymentMode,
          amount: parseFloat(form.amount) || 0,
          amountPaid: parseFloat(form.amountPaid) || 0,
          notes: form.notes || null,
        }),
      });

      // Auto-schedule renewal reminder if end date is set
      if (form.endDate && newSub?.id) {
        await fetch('/api/reminders/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: newSub.id,
            companyId: selectedClient?.companyId || companyId,
            clientId: form.clientId,
            endDate: form.endDate,
          }),
        }).catch(() => {/* non-blocking */});
      }

      success('Subscription created successfully!');
      setDone(true);
      setTimeout(() => router.push('/subscriptions'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to create subscription.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-600 text-foreground mb-1">Subscription Created!</h2>
            <p className="text-sm text-muted-foreground">Redirecting to subscriptions…</p>
          </div>
        </div>
      </>
    );
  }

  const BILLING_CYCLES = [
    { value: 'monthly' as const,   label: 'Monthly' },
    { value: 'quarterly' as const, label: 'Quarterly' },
    { value: 'yearly' as const,    label: 'Yearly' },
  ];

  const PAYMENT_MODES = [
    { value: 'online',        label: 'Online' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash',          label: 'Cash' },
    { value: 'cheque',        label: 'Cheque' },
    { value: 'upi',           label: 'UPI' },
  ];

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-600 text-foreground">Add Subscription</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create a subscription record for a client</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
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
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none text-foreground"
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
                {clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No clients found. Add clients first.</p>
                )}
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1.5 uppercase tracking-wide">
                  SaaS Plan <span className="text-muted-foreground font-400">(optional)</span>
                </label>
                {plans.length === 0 ? (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                    No active SaaS plans found. Add plans in the Plans section first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {/* No plan option */}
                    <label className={`flex items-center gap-4 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      form.saasPlanId === '' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="plan"
                        value=""
                        checked={form.saasPlanId === ''}
                        onChange={() => setForm(f => ({ ...f, saasPlanId: '' }))}
                        className="sr-only"
                      />
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-500 text-foreground text-sm">No plan</p>
                        <p className="text-xs text-muted-foreground">Manual / custom subscription</p>
                      </div>
                      {form.saasPlanId === '' && <CheckCircle size={16} className="text-primary flex-shrink-0" />}
                    </label>

                    {plans.map(p => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-4 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          form.saasPlanId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={p.id}
                          checked={form.saasPlanId === p.id}
                          onChange={() => handlePlanSelect(p.id)}
                          className="sr-only"
                        />
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-600 text-foreground text-sm">
                            {p.platform_name ? <span className="text-muted-foreground font-400">{p.platform_name} — </span> : ''}
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-700 text-foreground text-sm">
                            {p.price > 0 ? `₹${p.price.toLocaleString('en-IN')}` : 'Free'}
                          </p>
                          <p className="text-xs text-muted-foreground font-500 capitalize">{p.billing_cycle}</p>
                        </div>
                        {form.saasPlanId === p.id && <CheckCircle size={16} className="text-primary flex-shrink-0" />}
                      </label>
                    ))}
                  </div>
                )}
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
                        onChange={() => handleCycleChange(c.value)}
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
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
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
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
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
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
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
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
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
                        onChange={() => setForm(f => ({ ...f, paymentMode: m.value }))}
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
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-9 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !form.clientId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-white text-sm font-600 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><RefreshCw size={14} className="animate-spin" /> Creating…</>
                  ) : (
                    'Create Subscription'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
