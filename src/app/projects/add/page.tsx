'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientOption { id: string; name: string; }

export default function AddProjectPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    status: 'active',
  });
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('clients').select('id, name').order('name');
      setClients(data || []);
    };
    fetchClients();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.name.trim()) {
      setSubmitError('Project name is required.');
      return;
    }
    if (!formData.clientId) {
      setSubmitError('Please select a valid client.');
      return;
    }

    // Debug log before insert
    console.log('[AddProject] Insert payload:', {
      name: formData.name,
      client_id: formData.clientId,
    });

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('projects').insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        client_id: formData.clientId,
        status: formData.status,
        created_by: user?.id || null,
      });
      if (error) {
        setSubmitError(error.message);
        setSaving(false);
        return;
      }
      router.push('/projects');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save project.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-600 text-foreground">Add Project</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create a new project linked to a client</p>
          </div>
        </div>

        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white border border-border rounded-xl shadow-sm divide-y divide-border">
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-600 uppercase tracking-widest text-muted-foreground">Project Details</h2>

              {/* Client selector — required first */}
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
                  <option value="">— Select a client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Project name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-500 text-foreground">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-sm font-500 text-foreground">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional project description..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label htmlFor="status" className="block text-sm font-500 text-foreground">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="p-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/projects')}
                className="px-4 py-2 rounded-lg text-sm font-500 border border-border bg-white text-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.clientId}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Add Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
