'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;

  const [formData, setFormData] = useState({ title: '', description: '', status: 'pending', priority: 'medium', dueDate: '', clientId: '', leadId: '', assignedTo: '' });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [leads, setLeads] = useState<{ id: string; title: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    const fetchAll = async () => {
      const supabase = createClient();
      const [taskRes, clientsRes, leadsRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', taskId).single(),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('leads').select('id, title').order('title'),
        supabase.from('user_profiles').select('id, full_name').order('full_name'),
      ]);
      if (taskRes.error) { setSubmitError(taskRes.error.message); setLoading(false); return; }
      const r = taskRes.data;
      setFormData({
        title: r.title || '', description: r.description || '', status: r.status || 'pending',
        priority: r.priority || 'medium', dueDate: r.due_date || '',
        clientId: r.client_id || '', leadId: r.lead_id || '', assignedTo: r.assigned_to || '',
      });
      setClients(clientsRes.data || []);
      setLeads(leadsRes.data || []);
      setUsers(usersRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [taskId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { setSubmitError('Title is required'); return; }
    setSaving(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').update({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        client_id: formData.clientId || null,
        lead_id: formData.leadId || null,
        assigned_to: formData.assignedTo || null,
      }).eq('id', taskId);
      if (error) { setSubmitError(error.message); setSaving(false); return; }
      router.push(`/tasks/${taskId}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update task.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto"><div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}</div></div>;
  }

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/tasks/${taskId}`)} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
          <ArrowLeft size={16} />
        </button>
        <div><h1 className="text-2xl font-600 text-foreground">Edit Task</h1><p className="text-sm text-muted-foreground mt-0.5">Update task details</p></div>
      </div>
      {submitError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{submitError}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Task Details</h2>
            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-sm font-500 text-foreground">Title <span className="text-red-500">*</span></label>
              <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} placeholder="Task title"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-sm font-500 text-foreground">Description</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Additional details..." rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="status" className="block text-sm font-500 text-foreground">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="pending">Pending</option><option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="priority" className="block text-sm font-500 text-foreground">Priority</label>
                <select id="priority" name="priority" value={formData.priority} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="dueDate" className="block text-sm font-500 text-foreground">Due Date</label>
                <input id="dueDate" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="assignedTo" className="block text-sm font-500 text-foreground">Assigned To</label>
                <select id="assignedTo" name="assignedTo" value={formData.assignedTo} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="clientId" className="block text-sm font-500 text-foreground">Client</label>
                <select id="clientId" name="clientId" value={formData.clientId} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="leadId" className="block text-sm font-500 text-foreground">Lead</label>
                <select id="leadId" name="leadId" value={formData.leadId} onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">No lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="p-6 flex items-center justify-end gap-3">
            <button type="button" onClick={() => router.push(`/tasks/${taskId}`)} className="px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm disabled:opacity-60">
              <Save size={14} />{saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
