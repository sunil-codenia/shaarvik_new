'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertTriangle, Clock, X, ChevronDown, Search, DollarSign, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logAction } from '@/lib/logger';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import debug from '@/lib/debug';
import { useCompanyId } from '@/hooks/useCompanyId';

interface Invoice {
  id: string;
  invoiceNumber: string;
  companyName: string;
  companyEmail: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Paid', color: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDaysUntilDue(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InvoicesPage() {
  const { success, error: toastError } = useToast();
  const { loading: profileLoading, userId } = useCompanyId();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Payment modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      debug.authCheck('invoices', userId);

      debug.dbRequest('invoices', 'SELECT', 'invoices', {});
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          amount,
          discount,
          final_amount,
          paid_amount,
          balance_amount,
          status,
          created_at,
          company_subscriptions (
            id,
            companies!company_subscriptions_company_id_fkey (
              name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        debug.dbError('invoices', 'SELECT', 'invoices', error);
        toastError(`Failed to load invoices: ${error.message}`);
        setLoading(false);
        return;
      }
      debug.dbSuccess('invoices', 'SELECT', 'invoices', { count: data?.length });
      setInvoices((data || []).map((r: any) => ({
        id: r.id,
        invoiceNumber: r.invoice_number || '',
        companyName: r.company_subscriptions?.companies?.name || '',
        companyEmail: r.company_subscriptions?.companies?.email || '',
        invoiceDate: r.invoice_date,
        dueDate: r.due_date,
        amount: Number(r.amount || 0),
        discount: Number(r.discount || 0),
        finalAmount: Number(r.final_amount || 0),
        paidAmount: Number(r.paid_amount || 0),
        balanceAmount: Number(r.balance_amount || 0),
        status: r.status,
        createdAt: r.created_at,
      })));
    } catch {}
    setLoading(false);
  }, [userId, toastError]);

  useEffect(() => {
    if (profileLoading) return;
    fetchInvoices();
  }, [profileLoading, fetchInvoices]);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.companyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.companyEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pagination = usePagination(filtered, 20);

  const overdue = invoices.filter(i => i.status === 'overdue');
  const dueSoon = invoices.filter(i => i.status === 'pending' && getDaysUntilDue(i.dueDate) >= 0 && getDaysUntilDue(i.dueDate) <= 7);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.paidAmount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.balanceAmount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.balanceAmount, 0);

  const openPaymentModal = (inv: Invoice) => {
    setPaymentInvoice(inv);
    setPayAmount(inv.balanceAmount.toFixed(2));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod('bank_transfer');
    setPayRef('');
    setPayNotes('');
    setPayError(null);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { setPayError('Enter a valid payment amount.'); return; }
    if (amt > paymentInvoice.balanceAmount + 0.001) {
      setPayError(`Payment cannot exceed balance of ${fmt(paymentInvoice.balanceAmount)}.`);
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      debug.authCheck('invoices:payment', user?.id ?? null);
      if (!user) { setPayError('You must be logged in.'); setPaying(false); return; }

      const paymentPayload = {
        invoice_id: paymentInvoice.id,
        amount: amt,
        payment_date: payDate,
        payment_method: payMethod,
        reference_number: payRef.trim() || null,
        notes: payNotes.trim() || null,
        created_by: user?.id || null,
      };
      debug.dbRequest('invoices', 'INSERT', 'invoice_payments', paymentPayload);
      const { error } = await supabase.from('invoice_payments').insert(paymentPayload);
      if (error) {
        debug.dbError('invoices', 'INSERT', 'invoice_payments', error);
        setPayError(error.message);
        setPaying(false);
        return;
      }
      debug.dbSuccess('invoices', 'INSERT', 'invoice_payments', { invoice_id: paymentInvoice.id, amount: amt });
      await logAction({
        action: 'payment_created',
        module: 'Billing',
        description: `Payment of ${fmt(amt)} recorded for invoice ${paymentInvoice.invoiceNumber} (${paymentInvoice.companyName})`,
        user_id: user?.id,
        metadata: {
          invoice_id: paymentInvoice.id,
          invoice_number: paymentInvoice.invoiceNumber,
          client: paymentInvoice.companyName,
          amount: amt,
          method: payMethod,
          reference: payRef.trim() || null,
        },
      });
      setPaymentInvoice(null);
      success(`Payment of ${fmt(amt)} recorded successfully!`);
      fetchInvoices();
    } catch (err: any) {
      setPayError(err?.message || 'Payment failed.');
    }
    setPaying(false);
  };

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all client invoices and payments</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-700 text-green-600">{fmt(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">From paid invoices</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide mb-1">Pending Amount</p>
          <p className="text-2xl font-700 text-amber-600">{fmt(totalPending)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{invoices.filter(i => i.status === 'pending').length} pending invoices</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs font-500 text-muted-foreground uppercase tracking-wide mb-1">Overdue Amount</p>
          <p className="text-2xl font-700 text-red-600">{fmt(totalOverdue)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{overdue.length} overdue invoices</p>
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-red-700">Overdue Invoices ({overdue.length})</p>
            <p className="text-xs text-red-600 mt-0.5">{overdue.map(i => i.invoiceNumber).join(', ')} — Immediate action required.</p>
          </div>
        </div>
      )}
      {dueSoon.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
          <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-amber-700">Due in Next 7 Days ({dueSoon.length})</p>
            <p className="text-xs text-amber-600 mt-0.5">{dueSoon.map(i => `${i.invoiceNumber} (${getDaysUntilDue(i.dueDate)}d)`).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice, company, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); pagination.reset(); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); pagination.reset(); }}
            className="pl-3 pr-8 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none appearance-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <button onClick={fetchInvoices} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-sm text-muted-foreground hover:bg-muted transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={32} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No invoices found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Invoices are auto-created when a lead is converted to a client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Invoice No</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Email</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagination.paged.map(inv => {
                  const sc = statusConfig[inv.status] || statusConfig.pending;
                  const isOverdueRow = inv.status === 'overdue';
                  const daysLeft = inv.dueDate ? getDaysUntilDue(inv.dueDate) : null;
                  const isDueSoon = inv.status === 'pending' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  return (
                    <tr key={inv.id} className={`hover:bg-muted/20 transition-colors ${isOverdueRow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-600 text-foreground text-xs">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-500 text-foreground">{inv.companyName}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{inv.companyEmail}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-600 text-foreground">{fmt(inv.finalAmount || inv.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-500 text-green-600">{fmt(inv.paidAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-600 text-red-600">{fmt(inv.balanceAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 border ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs ${isOverdueRow ? 'text-red-600 font-600' : isDueSoon ? 'text-amber-600 font-500' : 'text-muted-foreground'}`}>
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          {isDueSoon && daysLeft !== null && <span className="ml-1">({daysLeft}d)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && inv.balanceAmount > 0 && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-600 bg-primary text-white hover:bg-primary/90 transition-colors"
                          >
                            <DollarSign size={10} /> Add Payment
                          </button>
                        )}
                        {inv.status === 'paid' && (
                          <span className="flex items-center gap-1 text-[11px] text-green-600 font-500">
                            <CheckCircle size={11} /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4">
              <PaginationBar
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onNext={pagination.next}
                onPrev={pagination.prev}
                onGoTo={pagination.goTo}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-600 text-foreground">Add Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{paymentInvoice.invoiceNumber} — {paymentInvoice.companyName}</p>
              </div>
              <button onClick={() => setPaymentInvoice(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Invoice</p>
                  <p className="text-sm font-600 text-foreground">{fmt(paymentInvoice.finalAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</p>
                  <p className="text-sm font-600 text-green-600">{fmt(paymentInvoice.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
                  <p className="text-sm font-600 text-red-600">{fmt(paymentInvoice.balanceAmount)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-500 text-muted-foreground mb-1.5">Payment Amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number" min="0.01" step="0.01" required
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1.5">Payment Date <span className="text-red-500">*</span></label>
                  <input
                    type="date" required
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-500 text-muted-foreground mb-1.5">Method</label>
                  <div className="relative">
                    <select
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none appearance-none"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-500 text-muted-foreground mb-1.5">Reference Number</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="Transaction ID / Cheque No."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
              {payError && <p className="text-xs text-red-500">{payError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPaymentInvoice(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
                <button type="submit" disabled={paying} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-60">
                  {paying ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
