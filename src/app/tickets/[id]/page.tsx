'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ticket, Send, UserPlus, UserMinus, AlertCircle, Clock, User, Package, CreditCard, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface TicketDetail {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  productName: string | null;
  subscriptionPlan: string | null;
  rmName: string | null;
  subject: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Assignee {
  userId: string;
  fullName: string;
  role: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

interface UserOption {
  id: string;
  fullName: string;
  role: string;
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

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params?.id as string;
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showAddAssignee, setShowAddAssignee] = useState(false);
  const [addingAssignee, setAddingAssignee] = useState<string | null>(null);
  const [removingAssignee, setRemovingAssignee] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [ticketRes, assigneesRes, commentsRes, usersRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select(`
            id, ticket_number, client_id, subject, description, priority, status, created_at, updated_at,
            clients(name),
            products(name),
            subscription:client_subscriptions(plan_name),
            rm:user_profiles!support_tickets_relationship_manager_id_fkey(full_name),
            creator:user_profiles!support_tickets_created_by_fkey(full_name)
          `)
          .eq('id', ticketId)
          .single(),
        supabase
          .from('ticket_assignees')
          .select('user_id, user_profiles(full_name, role)')
          .eq('ticket_id', ticketId),
        supabase
          .from('ticket_comments')
          .select('id, user_id, message, created_at, user_profiles(full_name)')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_profiles')
          .select('id, full_name, role')
          .order('full_name'),
      ]);

      if (ticketRes.error) { setError(ticketRes.error.message); setLoading(false); return; }
      const t = ticketRes.data;
      setTicket({
        id: t.id,
        ticketNumber: t.ticket_number,
        clientId: t.client_id,
        clientName: (t as any).clients?.name || '—',
        productName: (t as any).products?.name || null,
        subscriptionPlan: (t as any).subscription?.plan_name || null,
        rmName: (t as any).rm?.full_name || null,
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status,
        createdByName: (t as any).creator?.full_name || null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      });

      setAssignees((assigneesRes.data || []).map((a: any) => ({
        userId: a.user_id,
        fullName: a.user_profiles?.full_name || '—',
        role: a.user_profiles?.role || 'staff',
      })));

      setComments((commentsRes.data || []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user_profiles?.full_name || 'Unknown',
        message: c.message,
        createdAt: c.created_at,
      })));

      setAllUsers((usersRes.data || []).map((u: any) => ({ id: u.id, fullName: u.full_name, role: u.role })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    setUpdatingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);
    if (!error) {
      setTicket(prev => prev ? { ...prev, status: newStatus as any } : prev);
    }
    setUpdatingStatus(false);
  };

  const handleAddAssignee = async (userId: string) => {
    setAddingAssignee(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from('ticket_assignees')
      .insert({ ticket_id: ticketId, user_id: userId });
    if (!error) {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        setAssignees(prev => [...prev, { userId, fullName: user.fullName, role: user.role }]);
      }
    }
    setAddingAssignee(null);
    setShowAddAssignee(false);
  };

  const handleRemoveAssignee = async (userId: string) => {
    setRemovingAssignee(userId);
    const supabase = createClient();
    const { error } = await supabase
      .from('ticket_assignees')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('user_id', userId);
    if (!error) {
      setAssignees(prev => prev.filter(a => a.userId !== userId));
    }
    setRemovingAssignee(null);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSendingComment(true);
    setCommentError(null);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setCommentError('Not authenticated.'); setSendingComment(false); return; }

      const { data, error } = await supabase
        .from('ticket_comments')
        .insert({ ticket_id: ticketId, user_id: authUser.id, message: newComment.trim() })
        .select('id, user_id, message, created_at, user_profiles(full_name)')
        .single();

      if (error) { setCommentError(error.message); setSendingComment(false); return; }

      setComments(prev => [...prev, {
        id: data.id,
        userId: data.user_id,
        userName: (data as any).user_profiles?.full_name || 'You',
        message: data.message,
        createdAt: data.created_at,
      }]);
      setNewComment('');
    } catch (err: any) {
      setCommentError(err?.message || 'Failed to send comment.');
    } finally {
      setSendingComment(false);
    }
  };

  const availableToAdd = allUsers.filter(u => !assignees.some(a => a.userId === u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-red-500">{error || 'Ticket not found'}</p>
        <Link href="/tickets" className="text-sm text-primary hover:underline">Back to tickets</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/tickets" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket size={16} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-600 text-foreground">{ticket.subject}</h1>
                <span className="text-xs font-600 text-primary bg-primary/10 px-2 py-0.5 rounded">{ticket.ticketNumber}</span>
              </div>
              <p className="text-xs text-muted-foreground">Created {fmtDateTime(ticket.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-500 ${priorityConfig[ticket.priority]?.color}`}>
            {priorityConfig[ticket.priority]?.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-500 ${statusConfig[ticket.status]?.color}`}>
            {statusConfig[ticket.status]?.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
          {/* Left: Details + Comments */}
          <div className="lg:col-span-2 flex flex-col border-r border-border">
            {/* Ticket Info */}
            <div className="p-6 border-b border-border">
              <h2 className="text-sm font-600 text-foreground mb-4">Ticket Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <Link href={`/clients/${ticket.clientId}`} className="text-sm font-500 text-primary hover:underline">{ticket.clientName}</Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Package size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="text-sm font-500 text-foreground">{ticket.productName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Subscription</p>
                    <p className="text-sm font-500 text-foreground">{ticket.subscriptionPlan || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship Manager</p>
                    <p className="text-sm font-500 text-foreground">{ticket.rmName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="text-sm font-500 text-foreground">{ticket.createdByName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-500 text-foreground">{fmtDateTime(ticket.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {ticket.description && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1.5">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="flex-1 flex flex-col p-6">
              <h2 className="text-sm font-600 text-foreground mb-4">Conversation ({comments.length})</h2>
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-96">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No comments yet. Start the conversation.</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className={`flex gap-3 ${comment.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-600 text-primary">
                          {comment.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className={`max-w-[75%] ${comment.userId === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-3 py-2 rounded-xl text-sm ${
                          comment.userId === user?.id
                            ? 'bg-primary text-white rounded-tr-sm' :'bg-muted text-foreground rounded-tl-sm'
                        }`}>
                          {comment.message}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{comment.userName} · {fmtDateTime(comment.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {commentError && (
                <p className="text-xs text-red-500 mb-2">{commentError}</p>
              )}

              <form onSubmit={handleSendComment} className="flex items-end gap-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(e as any);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingComment || !newComment.trim()}
                  className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Right: Actions Panel */}
          <div className="p-6 space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">Change Status</h3>
              <div className="space-y-2">
                {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={updatingStatus || ticket.status === s}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-500 border transition-colors ${
                      ticket.status === s
                        ? `${statusConfig[s].color} border-current`
                        : 'border-border text-muted-foreground hover:bg-muted'
                    } disabled:opacity-60`}
                  >
                    <span>{statusConfig[s].label}</span>
                    {ticket.status === s && <span className="text-xs">Current</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Technical Assignees */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wide">Technical Assignees</h3>
                <button
                  onClick={() => setShowAddAssignee(!showAddAssignee)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                  title="Add assignee"
                >
                  <UserPlus size={14} />
                </button>
              </div>

              {showAddAssignee && availableToAdd.length > 0 && (
                <div className="mb-3 p-2 bg-muted/50 rounded-lg border border-border max-h-40 overflow-y-auto">
                  {availableToAdd.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleAddAssignee(u.id)}
                      disabled={addingAssignee === u.id}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white text-left transition-colors disabled:opacity-60"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-600 text-primary">{u.fullName[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-500 text-foreground truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {assignees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assignees yet</p>
              ) : (
                <div className="space-y-2">
                  {assignees.map(a => (
                    <div key={a.userId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-600 text-primary">{a.fullName[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-500 text-foreground truncate">{a.fullName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{a.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignee(a.userId)}
                        disabled={removingAssignee === a.userId}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-60"
                        title="Remove assignee"
                      >
                        <UserMinus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <h3 className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-3">Priority</h3>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-500 ${priorityConfig[ticket.priority]?.color}`}>
                {priorityConfig[ticket.priority]?.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
