'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientOption { id: string; name: string; }
interface ProjectOption { id: string; name: string; client_id: string; }
interface UserOption { id: string; full_name: string; }

export default function AddTaskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const prefilledClientId = searchParams?.get('client_id') || '';
  const prefilledProjectId = searchParams?.get('project_id') || '';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    clientId: prefilledClientId,
    projectId: prefilledProjectId,
    assignedTo: '',
  });

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load clients, all projects, and users on mount
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [clientsRes, projectsRes, usersRes] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('projects').select('id, name, client_id').order('name'),
        supabase.from('user_profiles').select('id, full_name').order('full_name'),
      ]);
      setClients(clientsRes.data || []);
      setAllProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
    };
    fetchData();
  }, []);

  // Filter projects whenever selected client changes
  useEffect(() => {
    if (formData.clientId) {
      const filtered = allProjects.filter(p => p.client_id === formData.clientId);
      setFilteredProjects(filtered);
      // Reset project selection if it doesn't belong to new client
      setFormData(prev => ({
        ...prev,
        projectId: filtered.find(p => p.id === prev.projectId) ? prev.projectId : '',
      }));
    } else {
      setFilteredProjects([]);
      setFormData(prev => ({ ...prev, projectId: '' }));
    }
  }, [formData.clientId, allProjects]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.title.trim()) {
      setSubmitError('Title is required.');
      return;
    }
    if (!formData.clientId) {
      setSubmitError('Please select a valid client.');
      return;
    }
    if (!formData.projectId) {
      setSubmitError('Please select a valid project.');
      return;
    }

    // Debug log before insert
    console.log('[AddTask] Insert payload:', {
      client_id: formData.clientId,
      project_id: formData.projectId,
    });

    if (!formData.clientId || !formData.projectId) {
      setSubmitError('Please select valid parent record.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('tasks').insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        client_id: formData.clientId,
        project_id: formData.projectId,
        assigned_to: formData.assignedTo || null,
        created_by: user?.id || null,
      });
      if (error) {
        setSubmitError(error.message);
        setSaving(false);
        return;
      }
      router.push('/tasks');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save task.');
      setSaving(false);
    }
  };

  const clientSelected = !!formData.clientId;
  const projectSelected = !!formData.projectId;

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/tasks')}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-600 text-foreground">Add Task</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new task linked to a client and project</p>
        </div>
      </div>

      {submitError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">

          {/* ── Hierarchy Section ── */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">
              Parent Hierarchy <span className="text-red-500">*</span>
            </h2>

            {/* Client selector */}
            <div className="space-y-1.5">
              <label htmlFor="clientId" className="block text-sm font-500 text-foreground">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">— Select a client first —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Project selector — disabled until client selected */}
            <div className="space-y-1.5">
              <label htmlFor="projectId" className="block text-sm font-500 text-foreground">
                Project <span className="text-red-500">*</span>
                {!clientSelected && (
                  <span className="ml-2 text-xs text-muted-foreground font-400">(select a client first)</span>
                )}
              </label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                disabled={!clientSelected}
                className={`w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                  !clientSelected ? 'opacity-50 cursor-not-allowed bg-muted' : ''
                }`}
              >
                <option value="">
                  {clientSelected
                    ? filteredProjects.length === 0
                      ? '— No projects for this client —'
                      : '— Select a project —' :'— Select a client first —'}
                </option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {clientSelected && filteredProjects.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No projects found for this client. Create a project first.
                </p>
              )}
            </div>
          </div>

          {/* ── Task Details Section ── */}
          <div className="p-6 space-y-5">
            <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Task Details</h2>

            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-sm font-500 text-foreground">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Send updated proposal"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-sm font-500 text-foreground">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional details..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="status" className="block text-sm font-500 text-foreground">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="priority" className="block text-sm font-500 text-foreground">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dueDate" className="block text-sm font-500 text-foreground">Due Date</label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assignedTo" className="block text-sm font-500 text-foreground">Assigned To</label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="p-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/tasks')}
              className="px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !clientSelected || !projectSelected}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Add Task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
