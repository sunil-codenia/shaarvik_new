'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Eye, Ticket, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import debug from '@/lib/debug';
import { useCompanyId } from '@/hooks/useCompanyId';


interface TicketRow {
  id: string;
  ticketNumber: string;
  clientName: string;
  productName: string | null;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  rmName: string | null;
  assigneeNames: string[];
  updatedAt: string;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-50 text-blue-700' },
  high: { label: 'High', color: 'bg-amber-50 text-amber-700' },
  critical: { label: 'Critical', color: 'bg-red-50 text-red-700' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-50 text-green-700' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const { companyId, loading: profileLoading } = useCompanyId();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'all' | 'my_client' | 'my_assigned'>('all');
  const [userProfile, setUserProfile] = useState<{ id: string; role: string } | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
    if (data) setUserProfile({ id: data.id, role: data.role });
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!user || !companyId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      debug.authCheck('tickets', user?.id ?? null);
      debug.dbRequest('tickets', 'SELECT', 'support_tickets', { viewMode, companyId });
      let query = supabase
        .from('support_tickets')
        .select(`
          id, ticket_number, subject, priority, status, updated_at,
          clients(name),
          products(name)
        `)
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (viewMode === 'my_client' && userProfile) {
        query = query.eq('relationship_manager_id', userProfile.id);
      } else if (viewMode === 'my_assigned' && userProfile) {
        const { data: assignedTicketIds } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('user_id', userProfile.id);
        const ids = (assignedTicketIds || []).map((r: any) => r.ticket_id);
        if (ids.length === 0) {
          setTickets([]);
          setLoading(false);
          return;
        }
        query = query.in('id', ids);
      }

      const { data, error: qErr } = await query;
      if (qErr) {
        debug.dbError('tickets', 'SELECT', 'support_tickets', qErr);
        toastError(`Failed to load tickets: ${qErr.message}`);
        setError(qErr.message);
        setLoading(false);
        return;
      }
      debug.dbSuccess('tickets', 'SELECT', 'support_tickets', { count: data?.length });

      const mapped: TicketRow[] = (data || []).map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        clientName: t.clients?.name || '—',
        productName: t.products?.name || null,
        subject: t.subject,
        priority: t.priority,
        status: t.status,
        rmName: null,
        assigneeNames: [],
        updatedAt: t.updated_at,
      }));
      setTickets(mapped);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [user, companyId, viewMode, userProfile, toastError]);

  useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchTickets();
  }, [companyId, profileLoading, fetchTickets]);

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Ticket size={16} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-600 text-foreground">Support Tickets</h1>
            <p className="text-xs text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link
          href="/tickets/new"
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          New Ticket
        </Link>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 bg-white border-b border-border flex-shrink-0">
        {[
          { key: 'all', label: 'All Tickets' },
          { key: 'my_client', label: 'My Client Tickets' },
          { key: 'my_assigned', label: 'My Assigned Tickets' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key as any)}
            className={`px-4 py-2.5 text-sm font-500 border-b-2 transition-colors ${
              viewMode === tab.key
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 bg-white border-b border-border flex-shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={fetchTickets}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Ticket size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No tickets found</p>
            <Link href="/tickets/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Plus size={14} /> Create first ticket
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Ticket No</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">RM</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Assignees</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap">Last Updated</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(() => {
                    const ticketPagination = filtered.slice(0, 20);
                    return ticketPagination.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-600 text-primary text-xs">{ticket.ticketNumber}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-foreground font-500">{ticket.clientName}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-muted-foreground">{ticket.productName || '—'}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-sm text-foreground truncate block">{ticket.subject}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-500 ${priorityConfig[ticket.priority]?.color}`}>
                            {priorityConfig[ticket.priority]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-500 ${statusConfig[ticket.status]?.color}`}>
                            {statusConfig[ticket.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-muted-foreground">{ticket.rmName || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {ticket.assigneeNames.length === 0 ? (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {ticket.assigneeNames.slice(0, 2).map((name, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">{name}</span>
                              ))}
                              {ticket.assigneeNames.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">+{ticket.assigneeNames.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground">{fmtDate(ticket.updatedAt)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-500 text-foreground transition-colors"
                          >
                            <Eye size={12} />
                            View
                          </Link>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {filtered.length > 20 && (
              <div className="px-4 py-3 border-t border-border bg-muted/10 text-xs text-muted-foreground text-center">
                Showing 20 of {filtered.length} tickets. Use filters to narrow results.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
