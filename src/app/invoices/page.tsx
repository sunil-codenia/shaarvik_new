'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertTriangle, Clock, X, ChevronDown, Search, DollarSign, CheckCircle, RefreshCw, Download } from 'lucide-react';
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
  gateway?: string;
  // Enhanced fields for PDF
  clientAddress?: string;
  clientPhone?: string;
  clientGst?: string;
  subscriptionPlan?: string;
  providerName?: string;
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
  const { loading: profileLoading, companyId, userId } = useCompanyId();
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
    if (!companyId) return;
    setLoading(true);
    try {
      debug.authCheck('invoices', userId);
      debug.dbRequest('invoices', 'SELECT', 'invoices', { companyId });
      
      const res = await fetch(`/api/mysql/invoices?companyId=${companyId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch invoices: ${res.statusText}`);
      }
      
      const data = await res.json();
      debug.dbSuccess('invoices', 'SELECT', 'invoices', { count: data?.length });

      setInvoices((data || []).map((r: any) => ({
        id: String(r.id),
        invoiceNumber: r.invoice_number || '',
        companyName: r.client?.name || r.client_name || 'Individual Client',
        companyEmail: r.client?.email || r.client_email || '',
        invoiceDate: r.invoice_date,
        dueDate: r.due_date,
        amount: Number(r.amount || 0),
        discount: Number(r.discount || 0),
        finalAmount: Number(r.final_amount || 0),
        paidAmount: Number(r.paid_amount || 0),
        balanceAmount: Number(r.balance_amount || 0),
        status: r.status,
        createdAt: r.createdAt || r.created_at,
        clientAddress: r.client?.address || '',
        clientPhone: r.client?.phone || '',
        clientGst: r.client?.gst || '',
        subscriptionPlan: r.subscription_plan || 'SaaS Subscription',
        providerName: r.provider?.name || 'Shaarvik Technologies LLP',
        gateway: r.gateway || '',
      })));
    } catch (err: any) {
      debug.dbError('invoices', 'SELECT', 'invoices', err);
      toastError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, toastError]);

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

  const handleDownloadPDF = async (inv: Invoice) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Branding Colors
      const primaryColor = [15, 23, 42]; // Slate 900
      const accentColor = [59, 130, 246]; // Blue 500
      
      // Local currency formatter for PDF
      const pdfFmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Payment Mode Mapper
      const getPaymentModeLabel = (mode: string) => {
        const m = mode?.toLowerCase();
        if (m === 'manual' || m === 'cash') return 'CASH';
        if (m === 'razorpay') return 'ONLINE / CARD';
        if (m === 'upi') return 'UPI';
        return m ? m.toUpperCase() : 'MANUAL';
      };

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 15, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(`#${inv.invoiceNumber}`, 15, 34);
      
      // Provider Details (Top Right)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(inv.providerName || 'Shaarvik Technologies LLP', pageWidth - 15, 20, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Shaarvik Technologies CP', pageWidth - 15, 27, { align: 'right' });
      doc.text('support@shaarvik.com', pageWidth - 15, 33, { align: 'right' });

      // Information Bar
      const barY = 58;
      const barHeight = 24;
      doc.setFillColor(250, 250, 250);
      doc.rect(15, barY, pageWidth - 30, barHeight, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.rect(15, barY, pageWidth - 30, barHeight, 'S');

      const col1 = 22;
      const col2 = 65;
      const col3 = 108;

      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE DATE', col1, barY + 8);
      doc.text('DUE DATE', col2, barY + 8);
      doc.text('PAYMENT MODE', col3, barY + 8);
      doc.text('STATUS', pageWidth - 22, barY + 8, { align: 'right' });

      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date(inv.invoiceDate).toLocaleDateString('en-IN'), col1, barY + 16);
      doc.text(new Date(inv.dueDate).toLocaleDateString('en-IN'), col2, barY + 16);
      doc.text(getPaymentModeLabel(inv.gateway || 'MANUAL'), col3, barY + 16);
      
      // Status Badge Styling
      const status = (inv.status || 'pending').toUpperCase();
      let badgeColor = [200, 200, 200];
      let textColor = [80, 80, 80];
      if (status === 'PAID') { badgeColor = [34, 197, 94]; textColor = [255, 255, 255]; }
      else if (status === 'PENDING') { badgeColor = [245, 158, 11]; textColor = [255, 255, 255]; }
      else if (status === 'OVERDUE') { badgeColor = [239, 68, 68]; textColor = [255, 255, 255]; }
      
      const badgeW = 20;
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(pageWidth - 15 - badgeW - 5, barY + 11.5, badgeW, 7, 1, 1, 'F');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(8);
      doc.text(status, pageWidth - 15 - (badgeW/2) - 5, barY + 16.3, { align: 'center' });

      // Client Section
      let y = 98;
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO', 15, y);
      
      y += 8;
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(12);
      doc.text(inv.companyName, 15, y);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      if (inv.companyEmail) { doc.text(inv.companyEmail, 15, y); y += 5; }
      if (inv.clientPhone) { doc.text(`+91 ${inv.clientPhone}`, 15, y); y += 5; }
      if (inv.clientAddress) { 
        const addrText = doc.splitTextToSize(inv.clientAddress, 100);
        doc.text(addrText, 15, y);
        y += (addrText.length * 5);
      }
      if (inv.clientGst) { 
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`GST NO: ${inv.clientGst}`, 15, y); 
      }

      // Line Items Table
      autoTable(doc, {
        startY: 140,
        head: [['#', 'Description', 'Qty', 'Rate', 'Total']],
        body: [['1', inv.subscriptionPlan || 'Saas Subscription Plan', '1', pdfFmt(inv.amount), pdfFmt(inv.amount)]],
        styles: { fontSize: 10, cellPadding: 6, valign: 'middle' },
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      });

      // Totals Block
      let totalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('Subtotal:', pageWidth - 80, totalY);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(pdfFmt(inv.amount), pageWidth - 15, totalY, { align: 'right' });

      totalY += 10;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(pageWidth - 90, totalY - 7, 75, 12, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL AMOUNT', pageWidth - 85, totalY + 1);
      doc.text(pdfFmt(inv.finalAmount), pageWidth - 20, totalY + 1, { align: 'right' });

      // Payment Details Side-note
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Payment Information:', 15, totalY + 25);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Method: ${getPaymentModeLabel(inv.gateway || 'MANUAL')}`, 15, totalY + 31);
      doc.text('Please quote invoice number on all bank transactions.', 15, totalY + 36);

      // Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 180, 180);
      doc.text('Thank you for choosing Shaarvik Technologies.', pageWidth/2, 280, { align: 'center' });
      doc.text('This is an electronically generated invoice.', pageWidth/2, 284, { align: 'center' });

      doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
      success('Premium invoice downloaded.');
    } catch (err: any) {
      console.error('PDF error:', err);
      toastError('Download failed.');
    }
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
      debug.authCheck('invoices:payment', userId);
      if (!userId) { setPayError('You must be logged in.'); setPaying(false); return; }

      // TODO: Implement MySQL migration for invoice_payments table
      toastError("Manual payment recording is currently being migrated to MySQL. Please check back soon.");
      setPaymentInvoice(null);
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
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Actions</th>
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
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <span className="font-600 text-foreground text-xs">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <span className="text-xs font-500 text-foreground">{inv.companyName}</span>
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap text-xs text-muted-foreground">{inv.companyEmail}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-600 text-foreground">{fmt(inv.finalAmount || inv.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-500 text-green-600">{fmt(inv.paidAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-600 text-red-600">{fmt(inv.balanceAmount)}</td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-600 border ${sc.color}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <span className="text-[11px] font-500 text-muted-foreground">
                          {(inv.gateway?.toLowerCase() === 'razorpay' || inv.gateway?.toLowerCase() === 'online') ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <span className={`text-xs ${isOverdueRow ? 'text-red-600 font-600' : isDueSoon ? 'text-amber-600 font-500' : 'text-muted-foreground'}`}>
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          {isDueSoon && daysLeft !== null && <span className="ml-1">({daysLeft}d)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && inv.balanceAmount > 0 && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-600 bg-primary text-white hover:bg-primary/90 transition-colors"
                            >
                              <DollarSign size={10} /> Add Payment
                            </button>
                          )}
                          {inv.status === 'paid' && (
                            <span className="flex items-center gap-1 text-[11px] text-green-600 font-500 mr-2">
                              <CheckCircle size={11} /> Paid
                            </span>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-600 border border-border bg-white text-foreground hover:bg-muted transition-colors"
                            title="Download PDF"
                          >
                            <Download size={11} /> Download
                          </button>
                        </div>
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
