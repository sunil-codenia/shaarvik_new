'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, TrendingUp, Phone, X, ChevronRight, MessageCircle, UserCheck, StickyNote, Edit2, Trash2, Activity, ChevronDown, Calendar, Filter, ArrowLeft, Building2, CreditCard, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}


interface Lead {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  companyName: string | null;
  status: string;
  createdAt: string;
  campaignId: string | null;
  dealValue: number | null;
  followUpDate: string | null;
  notes: string | null;
  isConverted: boolean;
  convertedToClientId: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  notes: string | null;
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
  paymentMode: 'online' | 'bank_transfer' | 'cash' | 'cheque' | 'upi' | 'razorpay' | 'stripe';
  amount: string;
  notes: string;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  new:       { label: 'New',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',       dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', dot: 'bg-yellow-500' },
  qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', dot: 'bg-purple-500' },
  proposal:  { label: 'Proposal',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
  won:       { label: 'Won',       color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     dot: 'bg-green-500' },
  lost:      { label: 'Lost',      color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             dot: 'bg-red-500' },
};

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  call:    { label: 'Call',    color: 'bg-blue-50 text-blue-600' },
  meeting: { label: 'Meeting', color: 'bg-violet-50 text-violet-600' },
  message: { label: 'Message', color: 'bg-sky-50 text-sky-600' },
  email:   { label: 'Email',   color: 'bg-amber-50 text-amber-600' },
  note:    { label: 'Note',    color: 'bg-gray-50 text-gray-600' },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function InfoRow({ label, value, dark }: { label: string; value: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 border-b last:border-0 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
      <p className={`text-xs font-medium w-28 flex-shrink-0 pt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <div className={`flex-1 text-sm ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
        {value || <span className={dark ? 'text-gray-600' : 'text-gray-300'}>—</span>}
      </div>
    </div>
  );
}

export default function LeadsClient() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const { isDark: darkMode } = useTheme();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  // Conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [saasPlans, setSaasPlans] = useState<SaasPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
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
  const [convertError, setConvertError] = useState<string | null>(null);

  const loadLeads = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    setError(null);
    try {
      const currentOffset = isLoadMore ? leads.length : 0;
      const response = await fetch(`/api/mysql/leads?limit=${pageSize}&offset=${currentOffset}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load leads');

      const mapped = (Array.isArray(data) ? data : []).map((row: any) => ({
        id: row.id,
        full_name: row.full_name || null,
        phone: row.phone || null,
        email: row.email || null,
        companyName: row.company_name || null,
        status: row.status || 'new',
        createdAt: row.createdAt,
        campaignId: row.campaign_id || null,
        dealValue: row.deal_value ?? null,
        followUpDate: row.follow_up_date || null,
        notes: row.notes || null,
        isConverted: !!row.is_converted,
        convertedToClientId: row.converted_to_client_id || null,
      }));
      
      if (isLoadMore) {
        setLeads(prev => [...prev, ...mapped]);
      } else {
        setLeads(mapped);
      }
      
      setHasMore(mapped.length === pageSize);
    } catch (err: any) {
      setError(err?.message || 'Failed to load leads.');
      toastError(err?.message || 'Failed to load leads.');
    } finally {
      if (!isLoadMore) setLoading(false);
    }
  }, [leads.length, toastError]);

  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      const verifyAndFinalize = async () => {
        setConverting(true);
        try {
          const responseVerify = await fetch(`/api/payments/stripe/verify-session?session_id=${sessionId}`, {
            headers: { Accept: 'application/json' },
          });
          const verify = await responseVerify.json();
          
          if (verify.success && verify.metadata.type === 'conversion') {
            const m = verify.metadata;
            // Reconstruct the conversion payload
            const resConv = await fetch('/api/leads/convert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leadId: m.itemId,
                address: m.address || null,
                gstNumber: m.gstNumber || null,
                billingEmail: m.billingEmail || null,
                saasPlanId: m.saasPlanId || null,
                billingCycle: m.billingCycle,
                paymentMode: 'stripe',
                amount: verify.amount_total,
                notes: 'Lead converted after Stripe payment',
                transactionId: sessionId,
                gateway: 'stripe',
              }),
            });
            const dataConv = await resConv.json();
            if (!resConv.ok) throw new Error(dataConv.error || 'Conversion failed');
            
            toastSuccess('Payment successful! Lead converted to client.');
            router.replace('/clients');
          }
        } catch (err: any) {
          setConvertError('Payment verification failed: ' + err.message);
        } finally {
          setConverting(false);
        }
      };
      verifyAndFinalize();
    } else if (payment === 'cancel') {
      toastError('Payment was cancelled.');
      router.replace('/leads');
    }
  }, [searchParams, router, toastSuccess, toastError]);

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

  useEffect(() => {
    loadLeads();
    loadSaasPlans();
  }, [loadLeads, loadSaasPlans]);

  const loadActivities = useCallback(async (leadId: string) => {
    setLoadingActivities(true);
    try {
      const response = await fetch(`/api/mysql/activities?leadId=${encodeURIComponent(leadId)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load activities');

      setActivities((Array.isArray(data) ? data : []).map((a: any) => ({
        id: a.id, 
        type: a.type, 
        summary: a.summary, 
        notes: a.notes,
        activityDate: a.activity_date || a.activityDate,
      })));
    } catch {
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, []);


  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowNoteInput(false);
    setNoteText('');
    loadActivities(lead.id);
    setMobileDetailOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedLead || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const response = await fetch('/api/mysql/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          type: 'note',
          summary: noteText.trim(),
          activity_date: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save note');
      }
      toastSuccess('Note saved!');
      setNoteText('');
      setShowNoteInput(false);
      loadActivities(selectedLead.id);
    } catch (err: any) {
      toastError(err?.message || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/mysql/leads/${encodeURIComponent(selectedLead.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete lead');
      }
      toastSuccess('Lead deleted.');
      setSelectedLead(null);
      setShowDeleteConfirm(false);
      setMobileDetailOpen(false);
      loadLeads();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete lead.');
    } finally {
      setDeleting(false);
    }
  };

  const openConvertModal = () => {
    if (!selectedLead || selectedLead.isConverted) return;
    setConvertForm({
      address: '',
      gstNumber: '',
      billingEmail: selectedLead.email || '',
      saasPlanId: '',
      billingCycle: 'monthly',
      paymentMode: 'online',
      amount: selectedLead.dealValue ? String(selectedLead.dealValue) : '',
      notes: '',
    });
    setConvertError(null);
    setShowConvertModal(true);
    loadSaasPlans();
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || converting) return;
    setConvertError(null);
    setConverting(true);
    try {
      const plan = saasPlans.find(p => p.id === convertForm.saasPlanId);
      const planName = plan ? plan.name : 'Subscription';
      const amount = parseFloat(String(convertForm.amount).replace(/,/g, '')) || 0;

      // --- 1. Handle Razorpay ---
      if (convertForm.paymentMode === 'razorpay') {
        const orderRes = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, receipt: `conv_${selectedLead.id}` }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create Razorpay order');

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_SfhYBnCq9j5Qaf',
          order_id: orderData.id,
          name: 'Shaarvik Technologies',
          description: `Subscription: ${planName}`,
          image: '/logo.png',
          handler: async (response: any) => {
            try {
              const vRes = await fetch('/api/payments/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              const vData = await vRes.json();
              if (!vRes.ok) throw new Error(vData.error || 'Verification failed');
              await finalizeConversion(response.razorpay_payment_id, 'razorpay');
            } catch (err: any) {
              setConvertError('Payment verification failed.');
              setConverting(false);
            }
          },
          prefill: {
            name: selectedLead.full_name || '',
            email: selectedLead.email || '',
          },
          theme: { color: '#9333ea' },
          modal: { ondismiss: () => setConverting(false) }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // --- 3. Default (Offline) ---
      await finalizeConversion(null, 'manual');

    } catch (err: any) {
      setConvertError(err?.message || 'Failed to convert lead.');
      setConverting(false);
    }
  };

  const finalizeConversion = async (tid: string | null, gateway: string) => {
    try {
      const res = await fetch('/api/leads/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead?.id,
          address: convertForm.address || null,
          gstNumber: convertForm.gstNumber || null,
          billingEmail: convertForm.billingEmail || null,
          saasPlanId: convertForm.saasPlanId || null,
          billingCycle: convertForm.billingCycle,
          paymentMode: convertForm.paymentMode,
          amount: convertForm.amount ? Number(convertForm.amount) : null,
          notes: convertForm.notes || null,
          transactionId: tid,
          gateway: gateway,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      toastSuccess(`Lead converted to client: ${data.displayName}`);
      setShowConvertModal(false);
      router.push('/clients');
    } catch (err: any) {
      setConvertError(err?.message || 'Failed to finalize conversion.');
    } finally {
      setConverting(false);
    }
  };


  const selectedPlan = saasPlans.find(p => p.id === convertForm.saasPlanId);

  const now = new Date();
  const filtered = leads.filter(lead => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      lead.full_name?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.companyName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    let matchDate = true;
    if (dateFilter !== 'all') {
      const created = new Date(lead.createdAt);
      if (dateFilter === 'today') {
        matchDate = created.toDateString() === now.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        matchDate = created >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        matchDate = created >= monthAgo;
      }
    }
    return matchSearch && matchStatus && matchDate;
  });

  const dk = darkMode;

  const inputCls = `w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${dk ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`;
  const labelCls = `block text-xs font-semibold mb-1 ${dk ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <>
      <div className={`h-[calc(100vh-64px)] flex flex-col ${dk ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {/* Top Bar */}
        <div className={`flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-lg font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Leads</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dk ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {loading ? '...' : filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/leads/add" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-sm">
              <Plus size={14} /><span>Add Lead</span>
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className={`flex-shrink-0 flex flex-wrap items-center gap-2 px-4 lg:px-6 py-2.5 border-b ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className={`relative flex-1 min-w-[180px] max-w-xs`}>
            <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${dk ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
            />
          </div>
          <div className="relative">
            <Filter size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
            <select
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className={`pl-7 pr-7 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all ${dk ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <div className="relative">
            <Calendar size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
            <select
              value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className={`pl-7 pr-7 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none transition-all ${dk ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <ChevronDown size={11} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          {(statusFilter !== 'all' || dateFilter !== 'all' || search) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setDateFilter('all'); }}
              className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${dk ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Split Screen Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Lead List */}
          <div className={`${mobileDetailOpen ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 border-r overflow-y-auto ${dk ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            {loading && (
              <div className="p-3 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`rounded-xl p-4 animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${dk ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      <div className="flex-1 space-y-2">
                        <div className={`h-3 rounded w-2/3 ${dk ? 'bg-gray-700' : 'bg-gray-200'}`} />
                        <div className={`h-2.5 rounded w-1/2 ${dk ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${dk ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <TrendingUp size={20} className={dk ? 'text-gray-500' : 'text-gray-400'} />
                </div>
                <p className={`text-sm font-medium mb-1 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>
                  {search || statusFilter !== 'all' || dateFilter !== 'all' ? 'No leads match filters' : 'No leads yet'}
                </p>
                <p className={`text-xs mb-4 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                  {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first lead to get started.'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Link href="/leads/add" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-sm">
                    <Plus size={13} /> Add Lead
                  </Link>
                )}
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="p-2 space-y-1">
                {filtered.map(lead => {
                  const sc = statusConfig[lead.status] || { label: lead.status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left rounded-xl px-3 py-3 transition-all duration-150 group border ${
                        isSelected
                          ? dk ? 'bg-primary/20 border-primary/50' : 'bg-primary/5 border-primary/30' : dk ?'bg-transparent border-transparent hover:bg-gray-800 hover:border-gray-700' : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isSelected ? 'bg-primary text-white' : dk ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getInitials(lead.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${dk ? 'text-white' : 'text-gray-900'}`}>
                              {lead.full_name || <span className={dk ? 'text-gray-500' : 'text-gray-400'}>Unnamed Lead</span>}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${sc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {lead.companyName && (
                              <span className={`text-[11px] truncate max-w-[120px] ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                                {lead.companyName}
                              </span>
                            )}
                            {lead.phone && (
                              <span className={`text-[11px] truncate max-w-[120px] ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                                {lead.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-[11px] ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
                              {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {lead.isConverted && (
                              <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Converted</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-colors ${isSelected ? 'text-primary' : dk ? 'text-gray-700 group-hover:text-gray-500' : 'text-gray-300 group-hover:text-gray-400'}`} />
                      </div>
                    </button>
                  );
                })}
                
                {hasMore && (
                  <button
                    onClick={() => loadLeads(true)}
                    className={`w-full py-3 text-xs font-semibold transition-all ${dk ? 'text-gray-500 hover:text-gray-400 bg-gray-800/50' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}
                  >
                    Load More Leads
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Lead Details Panel */}
          <div className={`${mobileDetailOpen ? 'flex' : 'hidden'} lg:flex flex-col flex-1 overflow-y-auto ${dk ? 'bg-gray-950' : 'bg-gray-50'}`}>
            {!selectedLead ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dk ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                  <TrendingUp size={28} className={dk ? 'text-gray-600' : 'text-gray-300'} />
                </div>
                <p className={`text-base font-semibold mb-1 ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Select a lead</p>
                <p className={`text-sm ${dk ? 'text-gray-600' : 'text-gray-400'}`}>Click any lead from the list to view details</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Detail Header */}
                <div className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setMobileDetailOpen(false); setSelectedLead(null); }}
                      className={`lg:hidden p-1.5 rounded-lg transition-colors ${dk ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white`}>
                      {getInitials(selectedLead.full_name)}
                    </div>
                    <div>
                      <h2 className={`text-base font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>
                        {selectedLead.full_name || 'Unnamed Lead'}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(() => {
                          const sc = statusConfig[selectedLead.status] || { label: selectedLead.status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/leads/${selectedLead.id}/edit`}
                      className={`p-2 rounded-lg transition-colors ${dk ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </Link>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={`p-2 rounded-lg transition-colors text-red-500 hover:bg-red-50`}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 border-b flex-wrap ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                  {selectedLead.phone && (
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-all shadow-sm"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  )}
                  {selectedLead.isConverted ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      <UserCheck size={13} /> Converted
                    </span>
                  ) : (
                    <button
                      onClick={openConvertModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm"
                    >
                      <UserCheck size={13} /> Convert to Client
                    </button>
                  )}
                  <button
                    onClick={() => setShowNoteInput(!showNoteInput)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      showNoteInput ? 'bg-amber-500 text-white' : dk ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <StickyNote size={13} /> Add Note
                  </button>
                  <Link
                    href={`/leads/${selectedLead.id}`}
                    className={`inline-flex items-center gap-1 text-xs font-medium ml-auto transition-colors ${dk ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Full Details <ChevronRight size={12} />
                  </Link>
                </div>

                {/* Note Input */}
                {showNoteInput && (
                  <div className={`flex-shrink-0 px-5 py-3 border-b ${dk ? 'bg-gray-900 border-gray-800' : 'bg-amber-50 border-amber-100'}`}>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Type your note here..."
                      rows={2}
                      className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none transition-all ${dk ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-amber-200 text-gray-900 placeholder:text-gray-400'}`}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote || !noteText.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50"
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      <button
                        onClick={() => { setShowNoteInput(false); setNoteText(''); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dk ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Detail Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Lead Info Card */}
                  <div className={`rounded-xl border p-4 ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>Contact Info</h3>
                    <InfoRow dark={dk} label="Name" value={selectedLead.full_name} />
                    <InfoRow dark={dk} label="Phone" value={selectedLead.phone ? <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a> : null} />
                    <InfoRow dark={dk} label="Email" value={selectedLead.email ? <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a> : null} />
                    <InfoRow dark={dk} label="Company" value={selectedLead.companyName} />
                  </div>

                  {/* Lead Meta Card */}
                  <div className={`rounded-xl border p-4 ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>Lead Details</h3>
                    <InfoRow dark={dk} label="Status" value={(() => {
                      const sc = statusConfig[selectedLead.status];
                      return sc ? <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}</span> : selectedLead.status;
                    })()} />
                    <InfoRow dark={dk} label="Deal Value" value={selectedLead.dealValue != null ? `₹${Number(selectedLead.dealValue).toLocaleString('en-IN')}` : null} />
                    <InfoRow dark={dk} label="Follow-up" value={selectedLead.followUpDate ? new Date(selectedLead.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null} />
                    <InfoRow dark={dk} label="Notes" value={selectedLead.notes} />
                    <InfoRow dark={dk} label="Created" value={new Date(selectedLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                  </div>

                  {/* Activity Timeline */}
                  <div className={`rounded-xl border p-4 ${dk ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Activity size={12} /> Activity ({activities.length})
                      </h3>
                      <Link href={`/activities/add?lead_id=${selectedLead.id}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                        <Plus size={11} /> Log
                      </Link>
                    </div>
                    {loadingActivities ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <div key={i} className={`h-8 rounded animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />)}
                      </div>
                    ) : activities.length === 0 ? (
                      <p className={`text-xs ${dk ? 'text-gray-600' : 'text-gray-400'}`}>No activities logged yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {activities.map((act, idx) => {
                          const tc = activityTypeConfig[act.type] || { label: act.type, color: 'bg-gray-50 text-gray-600' };
                          return (
                            <li key={act.id} className="flex gap-2.5">
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${tc.color}`}>
                                  {tc.label.slice(0, 2)}
                                </div>
                                {idx < activities.length - 1 && <div className={`w-px flex-1 mt-1 ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />}
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tc.color}`}>{tc.label}</span>
                                  <span className={`text-[11px] ${dk ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {new Date(act.activityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${dk ? 'text-gray-300' : 'text-gray-700'}`}>{act.summary}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Convert to Client Modal ─────────────────────────────────────────── */}
        {showConvertModal && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto">
            <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl ${dk ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
              {/* Modal Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                    <UserCheck size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className={`text-base font-semibold ${dk ? 'text-white' : 'text-gray-900'}`}>Convert to Client</h2>
                    <p className={`text-xs ${dk ? 'text-gray-500' : 'text-gray-500'}`}>{selectedLead.full_name || 'Lead'} → {selectedLead.companyName || 'Client'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className={`p-1.5 rounded-lg transition-colors ${dk ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {convertError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{convertError}</div>
                )}

                {/* Section: Client Details */}
                <div>
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
                    <Building2 size={14} className="text-primary" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Client Details</span>
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

                {/* Section: Plan & Subscription */}
                <div>
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
                    <FileText size={14} className="text-primary" />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Subscription Plan</span>
                    <span className={`text-[10px] ml-auto ${dk ? 'text-gray-600' : 'text-gray-400'}`}>Optional</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Select Plan</label>
                      {loadingPlans ? (
                        <div className={`h-9 rounded-lg animate-pulse ${dk ? 'bg-gray-800' : 'bg-gray-100'}`} />
                      ) : saasPlans.length === 0 ? (
                        <p className={`text-xs py-2 ${dk ? 'text-gray-500' : 'text-gray-400'}`}>No active plans found. You can add a subscription later.</p>
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
                          <ChevronDown size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                      )}
                    </div>

                    {convertForm.saasPlanId && (
                      <>
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
                              <ChevronDown size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${dk ? 'text-gray-500' : 'text-gray-400'}`} />
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
                      </>
                    )}
                  </div>
                </div>

                {/* Section: Payment */}
                {convertForm.saasPlanId && (
                  <div>
                    <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${dk ? 'border-gray-800' : 'border-gray-100'}`}>
                      <CreditCard size={14} className="text-primary" />
                      <span className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-gray-400' : 'text-gray-500'}`}>Payment Details</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Payment Mode</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['razorpay', 'online', 'upi'] as const).map(mode => (
                            <label
                              key={mode}
                              className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg border-2 cursor-pointer text-[10px] font-bold transition-all ${
                                convertForm.paymentMode === mode
                                  ? (mode === 'razorpay' ? 'border-blue-600 bg-blue-50 text-blue-700' : mode === 'stripe' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-primary bg-primary/10 text-primary')
                                  : dk ?'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                              <CreditCard size={14} className="mb-1" />
                              {mode === 'razorpay' ? 'Razorpay' : mode === 'stripe' ? 'Stripe' : mode === 'online' ? 'NetBank' : mode.toUpperCase()}
                            </label>
                          ))}
                          {(['bank_transfer', 'cash', 'cheque'] as const).map(mode => (
                            <label
                              key={mode}
                              className={`flex flex-col items-center justify-center px-1 py-2 rounded-lg border-2 cursor-pointer text-[10px] font-bold transition-all ${
                                convertForm.paymentMode === mode
                                  ? 'border-primary bg-primary/10 text-primary' : dk ?'border-gray-700 text-gray-400 hover:border-gray-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                  <div className={`rounded-xl p-3 ${dk ? 'bg-purple-900/20 border border-purple-800/40' : 'bg-purple-50 border border-purple-100'}`}>
                    <p className={`text-xs font-semibold mb-1 ${dk ? 'text-purple-300' : 'text-purple-700'}`}>Subscription Summary</p>
                    <p className={`text-xs ${dk ? 'text-purple-400' : 'text-purple-600'}`}>
                      {selectedPlan.name} · ₹{convertForm.amount || selectedPlan.price} / {convertForm.billingCycle} · {convertForm.paymentMode}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${dk ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
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

        {/* Delete Confirm Modal */}
        {showDeleteConfirm && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className={`rounded-xl shadow-xl p-6 max-w-sm w-full ${dk ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}>
              <h3 className={`text-base font-semibold mb-2 ${dk ? 'text-white' : 'text-gray-900'}`}>Delete Lead?</h3>
              <p className={`text-sm mb-5 ${dk ? 'text-gray-400' : 'text-gray-500'}`}>
                This will permanently delete <strong>{selectedLead.full_name || 'this lead'}</strong>. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${dk ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </>
  );
}

