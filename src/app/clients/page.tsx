'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePagination, PaginationBar } from '@/components/ui/Pagination';
import { Search, Users, Filter, Eye, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ClientRow {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  convertedDate: string | null;
  clientStatus: string | null;
  activePlan: string | null;
  subscriptionStatus: string | null;
}

type StatusFilter = 'all' | 'active' | 'trial' | 'expired';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground/40">—</span>;
  const cfg: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    trial: 'bg-blue-50 text-blue-700 border-blue-200',
    expired: 'bg-red-50 text-red-600 border-red-200',
    suspended: 'bg-amber-50 text-amber-700 border-amber-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${cfg[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {label}
    </span>
  );
}

function ClientStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground/40">—</span>;
  const cfg: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${cfg[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {label}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-xs text-muted-foreground/40">—</span>;
  const cfg: Record<string, string> = {
    reference: 'bg-purple-50 text-purple-700 border-purple-200',
    website: 'bg-sky-50 text-sky-700 border-sky-200',
    ads: 'bg-orange-50 text-orange-700 border-orange-200',
    lead_conversion: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const label = source === 'lead_conversion' ? 'Lead' : source.charAt(0).toUpperCase() + source.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 border ${cfg[source] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {label}
    </span>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mysql/clients', { headers: { Accept: 'application/json' } });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to load clients');

      setClients(data || []);
    } catch (err: any) {
      toastError(err?.message || 'Failed to load clients.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/mysql/clients/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete client');
      }
      setClients(prev => prev.filter(c => c.id !== id));
      toastSuccess('Client deleted successfully.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete client.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/mysql/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      setClients(prev => prev.map(c => c.id === id ? { ...c, clientStatus: newStatus } : c));
      toastSuccess(`Client marked as ${newStatus}.`);
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status.');
    }
  };

  const filtered = (clients ?? []).filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.activePlan?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.subscriptionStatus === 'active') ||
      (statusFilter === 'trial' && c.subscriptionStatus === 'trial') ||
      (statusFilter === 'expired' && (!c.subscriptionStatus || c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'suspended' || c.subscriptionStatus === 'inactive'));

    return matchSearch && matchStatus;
  });

  const pagination = usePagination(filtered, 20);
  const clientToDelete = confirmDeleteId ? clients.find(c => c.id === confirmDeleteId) : null;

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-600 text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/add-client"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-500 hover:bg-primary/90 transition-all"
        >
          <Plus size={15} />
          Add Client
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); pagination.reset(); }}
            placeholder="Search name, company, phone…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          <Filter size={13} className="ml-1.5 text-muted-foreground flex-shrink-0" />
          {(['all', 'active', 'trial', 'expired'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); pagination.reset(); }}
              className={`px-3 py-1 rounded-md text-xs font-600 capitalize transition-all ${
                statusFilter === f
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {confirmDeleteId && clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-600 text-foreground">Delete Client?</h3>
              <button onClick={() => setConfirmDeleteId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X size={14} /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete <strong>{clientToDelete.name}</strong> and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-600 bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-60"
              >
                {deletingId === confirmDeleteId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">#</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client Name</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Company Name</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Source</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Converted Date</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Active Plan</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Client Status</th>
                <th className="text-left px-4 py-3 text-xs font-600 uppercase tracking-wider text-muted-foreground whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-border animate-pulse">
                    {[...Array(9)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-muted rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users size={22} className="text-primary" />
                      </div>
                      <p className="text-sm font-500 text-foreground">
                        {search || statusFilter !== 'all' ? 'No clients match your filters' : 'No clients yet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {search || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Add your first client to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                (pagination.paged ?? []).map((client, idx) => (
                  <tr
                    key={client.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* # */}
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {(pagination.page - 1) * pagination.pageSize + idx + 1}
                    </td>

                    {/* Client Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-600 text-primary">
                            {client.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="font-500 text-foreground truncate block max-w-[140px]">{client.name}</span>
                          {client.email && (
                            <span className="text-xs text-muted-foreground truncate block max-w-[140px]">{client.email}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Company Name */}
                    <td className="px-4 py-3 text-sm text-foreground">
                      {client.companyName ? (
                        <span className="truncate max-w-[160px] block">{client.companyName}</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.phone ? (
                        <a href={`tel:${client.phone}`} className="text-sm text-primary hover:underline">
                          {client.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SourceBadge source={client.source} />
                    </td>

                    {/* Converted Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                      {client.convertedDate ? (
                        new Date(client.convertedDate).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Active Plan */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.activePlan ? (
                        <div>
                          <span className="text-sm text-foreground font-500">{client.activePlan}</span>
                          {client.subscriptionStatus && (
                            <StatusBadge status={client.subscriptionStatus} />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Client Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusToggle(client.id, client.clientStatus)}
                        title={`Click to mark as ${client.clientStatus === 'active' ? 'inactive' : 'active'}`}
                        className="cursor-pointer"
                      >
                        <ClientStatusBadge status={client.clientStatus} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-500 border border-border bg-white text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                        >
                          <Eye size={11} />
                          View
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-500 border border-border bg-white text-foreground hover:bg-muted transition-all"
                        >
                          <Edit2 size={11} />
                          Edit
                        </Link>
                        <button
                          onClick={() => setConfirmDeleteId(client.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-500 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 border-t border-border bg-muted/10">
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
        )}
      </div>
    </div>
  );
}
