'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Ticket, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ClientOption {
  id: string;
  name: string;
  rmId: string | null;
  rmName: string | null;
}

interface SubscriptionOption {
  id: string;
  planName: string;
  productId: string;
  productName: string;
}

interface ProductOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  fullName: string;
  role: string;
}

export default function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const prefillClientId = searchParams?.get('client_id') || '';
  const prefillSubId = searchParams?.get('subscription_id') || '';
  const prefillProductId = searchParams?.get('product_id') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [form, setForm] = useState({
    clientId: prefillClientId,
    subscriptionId: prefillSubId,
    productId: prefillProductId,
    subject: '',
    description: '',
    priority: 'medium\' as \'low\' | \'medium\' | \'high\' | \'critical',
  });

  const [rmName, setRmName] = useState<string | null>(null);
  const [rmId, setRmId] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  const loadInitialData = useCallback(async () => {
    const supabase = createClient();
    const [productsRes, usersRes] = await Promise.all([
      supabase.from('products').select('id, name').eq('status', 'active').order('name'),
      supabase.from('user_profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
    ]);

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name, created_by, user_profiles!clients_created_by_fkey(id, full_name)')
      .eq('status', 'active')
      .order('name');

    const mappedClients: ClientOption[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      rmId: c.user_profiles?.id || null,
      rmName: c.user_profiles?.full_name || null,
    }));
    setClients(mappedClients);
    setProducts((productsRes.data || []).map((p: any) => ({ id: p.id, name: p.name })));
    setUsers((usersRes.data || []).map((u: any) => ({ id: u.id, fullName: u.full_name, role: u.role })));
    setLoadingClients(false);

    if (prefillClientId) {
      const found = mappedClients.find(c => c.id === prefillClientId);
      if (found) {
        setRmId(found.rmId);
        setRmName(found.rmName);
      }
    }
  }, [prefillClientId]);

  const loadSubscriptions = useCallback(async (clientId: string) => {
    if (!clientId) { setSubscriptions([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('client_subscriptions')
      .select('id, plan_name, product_id, products(name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setSubscriptions((data || []).map((s: any) => ({
      id: s.id,
      planName: s.plan_name,
      productId: s.product_id,
      productName: s.products?.name || '—',
    })));
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (form.clientId) {
      loadSubscriptions(form.clientId);
      const found = clients.find(c => c.id === form.clientId);
      if (found) {
        setRmId(found.rmId);
        setRmName(found.rmName);
      }
    } else {
      setSubscriptions([]);
      setRmId(null);
      setRmName(null);
    }
  }, [form.clientId, clients, loadSubscriptions]);

  useEffect(() => {
    if (form.subscriptionId) {
      const sub = subscriptions.find(s => s.id === form.subscriptionId);
      if (sub) {
        setForm(f => ({ ...f, productId: sub.productId }));
      }
    }
  }, [form.subscriptionId, subscriptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { setError('Client is required.'); return; }
    if (!form.subject.trim()) { setError('Subject is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: ticket, error: insertErr } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: 'TKT00000',
          client_id: form.clientId,
          subscription_id: form.subscriptionId || null,
          product_id: form.productId || null,
          relationship_manager_id: rmId || null,
          subject: form.subject.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          status: 'open',
          created_by: authUser?.id || null,
        })
        .select('id')
        .single();

      if (insertErr) { setError(insertErr.message); setSaving(false); return; }

      if (selectedAssignees.length > 0 && ticket) {
        await supabase.from('ticket_assignees').insert(
          selectedAssignees.map(uid => ({ ticket_id: ticket.id, user_id: uid }))
        );
      }

      router.push(`/tickets/${ticket?.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create ticket.');
      setSaving(false);
    }
  };

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tickets" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Ticket size={16} className="text-primary" />
          </div>
          <h1 className="text-lg font-600 text-foreground">New Support Ticket</h1>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-600 text-foreground">Client Information</h2>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Client <span className="text-red-500">*</span></label>
            {loadingClients ? (
              <div className="h-10 bg-muted rounded-lg animate-pulse" />
            ) : (
              <select
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value, subscriptionId: '', productId: '' }))}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Relationship Manager</label>
            <div className="px-3 py-2.5 text-sm border border-border rounded-lg bg-muted/50 text-muted-foreground">
              {rmName || (form.clientId ? 'No RM assigned to this client' : 'Auto-filled from client')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Automatically assigned from client record</p>
          </div>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Subscription</label>
            <select
              value={form.subscriptionId}
              onChange={e => setForm(f => ({ ...f, subscriptionId: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={!form.clientId}
            >
              <option value="">Select subscription (optional)</option>
              {subscriptions.map(s => (
                <option key={s.id} value={s.id}>{s.productName} — {s.planName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Product</label>
            <select
              value={form.productId}
              onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select product (optional)</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-600 text-foreground">Ticket Details</h2>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Subject <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-500 text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detailed description of the issue..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        {users.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5 space-y-3">
            <h2 className="text-sm font-600 text-foreground">Assign To</h2>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-500 border transition-colors ${
                    selectedAssignees.includes(u.id)
                      ? 'bg-primary text-white border-primary' :'bg-white text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {u.fullName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/tickets"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
