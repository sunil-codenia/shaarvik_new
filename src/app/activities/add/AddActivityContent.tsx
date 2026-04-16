'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AddActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const prefilledClientId = searchParams?.get('client_id') || '';
  const prefilledLeadId = searchParams?.get('lead_id') || '';

  const [formData, setFormData] = useState({
    type: 'call', summary: '', notes: '', clientId: prefilledClientId, leadId: prefilledLeadId,
    activityDate: new Date().toISOString().slice(0, 16),
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [clientsRes, leadsRes] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('leads').select('id, title').order('title'),
      ]);
      setClients(clientsRes.data || []);
      setLeads(leadsRes.data || []);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.summary.trim()) { setSubmitError('Summary is required'); return; }
    setSaving(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('activities').insert({
        type: formData.type,
        summary: formData.summary.trim(),
        notes: formData.notes.trim() || null,
        client_id: formData.clientId || null,
        lead_id: formData.leadId || null,
        logged_by: user?.id || null,
        activity_date: formData.activityDate || new Date().toISOString(),
      });
      if (error) { setSubmitError(error.message); setSaving(false); return; }
      if (prefilledClientId) router.push(`/clients/${prefilledClientId}`);
      else if (prefilledLeadId) router.push(`/leads/${prefilledLeadId}`);
      else router.push('/activities');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to log activity.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
            <ArrowLeft size={16} />
          </button>
          <div><h1 className="text-2xl font-600 text-foreground">Log Activity</h1><p className="text-sm text-muted-foreground mt-0.5">Record a call, meeting, message, or note</p></div>
        </div>

        {submitError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{submitError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Activity Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="type" className="block text-sm font-500 text-foreground">Type</label>
                  <select id="type" name="type" value={formData.type} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="call">Call</option><option value="meeting">Meeting</option>
                    <option value="message">Message</option><option value="email">Email</option><option value="note">Note</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="activityDate" className="block text-sm font-500 text-foreground">Date & Time</label>
                  <input id="activityDate" name="activityDate" type="datetime-local" value={formData.activityDate} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="clientId" className="block text-sm font-500 text-foreground">Client</label>
                  <select id="clientId" name="clientId" value={formData.clientId} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="leadId" className="block text-sm font-500 text-foreground">Lead (optional)</label>
                  <select id="leadId" name="leadId" value={formData.leadId} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="">No lead</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="summary" className="block text-sm font-500 text-foreground">Summary <span className="text-red-500">*</span></label>
                <input id="summary" name="summary" type="text" value={formData.summary} onChange={handleChange} placeholder="Brief description of the activity"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="notes" className="block text-sm font-500 text-foreground">Notes</label>
                <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional details..." rows={4}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" />
              </div>
            </div>
            <div className="p-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm disabled:opacity-60">
                <Save size={14} />{saving ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
