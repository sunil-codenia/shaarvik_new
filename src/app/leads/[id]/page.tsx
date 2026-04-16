'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, Plus, Activity, UserCheck, ChevronDown, X, CreditCard, Building2, FileText } from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  companyName: string | null;
  campaignName: string | null;
  status: string;
  dealValue: number | null;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  isConverted: boolean;
  convertedToClientId: string | null;
  campaignId: string | null;
  companyId: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  notes: string | null;
  loggedByName: string | null;
  activityDate: string;
}

interface SaasPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: string;
  description: string | null;
  platformName: string | null;
}

interface ConvertForm {
  address: string;
  gstNumber: string;
  billingEmail: string;
  saasPlanId: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  paymentMode: 'online' | 'bank_transfer' | 'cash' | 'cheque' | 'upi';
  amount: string;
  notes: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-50 text-yellow-700' },
  qualified: { label: 'Qualified', color: 'bg-purple-50 text-purple-700' },
  proposal: { label: 'Proposal', color: 'bg-orange-50 text-orange-700' },
  won: { label: 'Won', color: 'bg-green-50 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-50 text-red-700' },
};

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  call: { label: 'Call', color: 'bg-blue-50 text-blue-600' },
  meeting: { label: 'Meeting', color: 'bg-violet-50 text-violet-600' },
  message: { label: 'Message', color: 'bg-sky-50 text-sky-600' },
  email: { label: 'Email', color: 'bg-amber-50 text-amber-600' },
  note: { label: 'Note', color: 'bg-gray-50 text-gray-600' },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <p className="text-xs font-500 text-muted-foreground w-28 flex-shrink-0 pt-0.5">{label}</p>
      <div className="flex-1 text-sm text-card-foreground">{value || <span className="text-muted-foreground/40">—</span>}</div>
    </div>
  );
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

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm>({
    address: '',
    gstNumber: '',
    billingEmail: '',
    saasPlanId: '',
    billingCycle: 'monthly',
    paymentMode: 'online',
    amount: '',
    notes: '',
  });

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const [leadRes, activitiesRes] = await Promise.all([
        fetchJson<any>(`/api/mysql/leads/${encodeURIComponent(leadId)}`),
        fetchJson<any[]>(`/api/mysql/activities?leadId=${encodeURIComponent(leadId)}`),
      ]);
      const r = leadRes;
      setLead({
        id: r.id,
        fullName: r.full_name || r.fullName || null,
        phone: r.phone || null,
        email: r.email || null,
        companyName: r.company_name || null,
        campaignName: r.campaign_name || r.campaignName || null,
        status: r.status || 'new',
        dealValue: r.deal_value != null ? Number(r.deal_value) : null,
        followUpDate: r.follow_up_date || null,
        notes: r.notes || null,
        createdAt: r.createdAt || r.created_at,
        isConverted: Boolean(r.is_converted),
        convertedToClientId: r.converted_to_client_id || r.convertedToClientId || null,
        campaignId: r.campaign_id || r.campaignId || null,
        companyId: r.company_id || r.companyId || null,
      });
      setActivities((activitiesRes || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        notes: a.notes,
        loggedByName: null,
        activityDate: a.activity_date || a.activityDate,
      })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const loadSaasPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch('/api/mysql/saas-plans', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load plans');
      setSaasPlans((Array.isArray(payload) ? payload : []).filter((p: any) => p.isActive !== false).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        billingCycle: p.billingCycle || p.billing_cycle || 'monthly',
        description: p.description || null,
        platformName: p.platformName || p.platform_name || null,
      })));
    } catch {
      setSaasPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const openConvertModal = () => {
    if (!lead || lead.isConverted) return;
    setConvertForm({
      address: '',
      gstNumber: '',
      billingEmail: lead.email || '',
      saasPlanId: '',
      billingCycle: 'monthly',
      paymentMode: 'online',
      amount: lead.dealValue ? String(lead.dealValue) : '',
      notes: '',
    });
    setConvertError(null);
    setShowConvertModal(true);
    loadSaasPlans();
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || converting) return;
    setConvertError(null);
    setConverting(true);
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          address: convertForm.address || null,
          gstNumber: convertForm.gstNumber || null,
          billingEmail: convertForm.billingEmail || null,
          saasPlanId: convertForm.saasPlanId || null,
          billingCycle: convertForm.billingCycle,
          paymentMode: convertForm.paymentMode,
          amount: convertForm.amount ? Number(convertForm.amount) : null,
          notes: convertForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      setShowConvertModal(false);
      router.push('/clients');
    } catch (err: any) {
      setConvertError(err?.message || 'Failed to convert lead.');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetchJson(`/api/mysql/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' });
      router.push('/leads');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete lead.');
      setDeleting(false);
    }
  };

  const selectedPlan = saasPlans.find(p => p.id === convertForm.saasPlanId);

  const inputCls = `w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all`;
  const labelCls = `block text-xs font-semibold mb-1 text-muted-foreground`;

  return (
    <div className="w-full">
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/leads')} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-600 text-foreground">Lead Details</h1>
            <p className="text-sm text-muted-foreground mt-0.5">View and manage lead information</p>
          </div>
          {lead && (
            <div className="flex items-center gap-2 flex-wrap">
              {!lead.isConverted && (
                <button
                  onClick={openConvertModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-600 bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm"
                >
                  <UserCheck size={14} /><span className="hidden sm:inline">Convert to Client</span>
                </button>
              )}
              <Link href={`/leads/${leadId}/edit`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">
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
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-base font-600 text-foreground mb-2">Delete Lead?</h3>
              <p className="text-sm text-muted-foreground mb-5">This will permanently delete <strong>{lead?.fullName || 'this lead'}</strong>. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Convert to Client Modal */}
        {showConvertModal && lead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-2xl shadow-2xl bg-white">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                    <UserCheck size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Convert to Client</h2>
                    <p className="text-xs text-gray-500">{lead.fullName || 'Lead'} → {lead.companyName || 'Client'}</p>
                  </div>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {convertError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{convertError}</div>
                )}

                {/* Client Details */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <Building2 size={14} className="text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Client Details</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Business Address</label>
                      <textarea
                        value={convertForm.address}
                        onChange={e => setConvertForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Full business address..."
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>GST Number</label>
                        <input
                          type="text"
                          value={convertForm.gstNumber}
                          onChange={e => setConvertForm(f => ({ ...f, gstNumber: e.target.value }))}
                          placeholder="22AAAAA0000A1Z5"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Billing Email</label>
                        <input
                          type="email"
                          value={convertForm.billingEmail}
                          onChange={e => setConvertForm(f => ({ ...f, billingEmail: e.target.value }))}
                          placeholder="billing@company.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <FileText size={14} className="text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Subscription Plan</span>
                    <span className="text-[10px] ml-auto text-gray-400">Optional</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Select Plan</label>
                      {loadingPlans ? (
                        <div className="h-9 rounded-lg animate-pulse bg-gray-100" />
                      ) : saasPlans.length === 0 ? (
                        <p className="text-xs py-2 text-gray-400">No active plans found. You can add a subscription later.</p>
                      ) : (
                        <div className="relative">
                          <select
                            value={convertForm.saasPlanId}
                            onChange={e => {
                              const plan = saasPlans.find(p => p.id === e.target.value);
                              setConvertForm(f => ({
                                ...f,
                                saasPlanId: e.target.value,
                                billingCycle: (plan?.billingCycle as any) || f.billingCycle,
                                amount: plan ? String(plan.price) : f.amount,
                              }));
                            }}
                            className={`${inputCls} pr-8 appearance-none`}
                          >
                            <option value="">— No plan (add later) —</option>
                            {saasPlans.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.platformName ? `${p.platformName} — ` : ''}{p.name} (₹{p.price}/{p.billingCycle})
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                        </div>
                      )}
                    </div>

                    {convertForm.saasPlanId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Billing Cycle</label>
                          <div className="relative">
                            <select
                              value={convertForm.billingCycle}
                              onChange={e => setConvertForm(f => ({ ...f, billingCycle: e.target.value as any }))}
                              className={`${inputCls} pr-8 appearance-none`}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Amount (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={convertForm.amount}
                            onChange={e => setConvertForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder="0"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Mode */}
                {convertForm.saasPlanId && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <CreditCard size={14} className="text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment Details</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Payment Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['online', 'upi', 'bank_transfer', 'cash', 'cheque'] as const).map(mode => (
                            <label
                              key={mode}
                              className={`flex items-center justify-center px-2 py-2 rounded-lg border-2 cursor-pointer text-xs font-semibold transition-all ${
                                convertForm.paymentMode === mode
                                  ? 'border-primary bg-primary/10 text-primary' :'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMode"
                                value={mode}
                                checked={convertForm.paymentMode === mode}
                                onChange={() => setConvertForm(f => ({ ...f, paymentMode: mode }))}
                                className="sr-only"
                              />
                              {mode === 'bank_transfer' ? 'Bank' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Notes</label>
                        <textarea
                          value={convertForm.notes}
                          onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Any additional notes..."
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {selectedPlan && (
                  <div className="rounded-xl p-3 bg-purple-50 border border-purple-100">
                    <p className="text-xs font-semibold mb-1 text-purple-700">Subscription Summary</p>
                    <p className="text-xs text-purple-600">
                      {selectedPlan.name} · ₹{convertForm.amount || selectedPlan.price} / {convertForm.billingCycle} · {convertForm.paymentMode}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={converting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {converting ? 'Converting...' : 'Convert to Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        )}

        {!loading && error && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button onClick={() => router.push('/leads')} className="text-sm text-primary hover:underline">Back to Leads</button>
          </div>
        )}

        {!loading && !error && lead && (
          <div className="space-y-5">
            {/* Converted Banner */}
            {lead.isConverted && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                <UserCheck size={18} className="text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-green-700">Lead Converted to Client</p>
                </div>
                {lead.convertedToClientId && (
                  <Link href="/clients" className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-600 bg-green-600 text-white hover:bg-green-700 transition-all">
                    View Clients →
                  </Link>
                )}
              </div>
            )}

            {/* Lead Info */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-4 pb-5 mb-2 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {getInitials(lead.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-600 text-card-foreground">{lead.fullName || 'Unnamed Lead'}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {(() => {
                      const sc = statusConfig[lead.status] || { label: lead.status, color: 'bg-gray-50 text-gray-600' };
                      return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>{sc.label}</span>;
                    })()}
                    {lead.isConverted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 bg-green-50 text-green-700">
                        <UserCheck size={10} /> Converted
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <InfoRow label="Status" value={(() => { const sc = statusConfig[lead.status]; return sc ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${sc.color}`}>{sc.label}</span> : lead.status; })()} />
              <InfoRow label="Name" value={lead.fullName} />
              <InfoRow label="Phone" value={lead.phone ? <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a> : null} />
              <InfoRow label="Email" value={lead.email ? <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a> : null} />
              <InfoRow label="Company" value={lead.companyName} />
              <InfoRow label="Campaign" value={lead.campaignName} />
              <InfoRow label="Deal Value" value={lead.dealValue != null ? `₹${Number(lead.dealValue).toLocaleString('en-IN')}` : null} />
              <InfoRow label="Follow-up Date" value={lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
              <InfoRow label="Created" value={new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
              {lead.notes && <InfoRow label="Notes" value={<span className="whitespace-pre-wrap">{lead.notes}</span>} />}
            </div>

            {/* Activity Timeline */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-600 uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity size={14} /> Activity Timeline ({activities.length})
                </h3>
                <Link href={`/activities/add?lead_id=${leadId}`} className="flex items-center gap-1 text-xs font-500 text-primary hover:text-primary/80 transition-colors">
                  <Plus size={12} /> Log Activity
                </Link>
              </div>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities logged yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((act, idx) => {
                    const tc = activityTypeConfig[act.type] || { label: act.type, color: 'bg-gray-50 text-gray-600' };
                    return (
                      <li key={act.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                            <span className="text-[10px] font-600">{tc.label.slice(0, 2)}</span>
                          </div>
                          {idx < activities.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${tc.color}`}>{tc.label}</span>
                            <span className="text-xs text-muted-foreground">{new Date(act.activityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{act.summary}</p>
                          {act.notes && <p className="text-xs text-muted-foreground mt-0.5">{act.notes}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
