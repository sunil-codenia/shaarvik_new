'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  companyName: string;
  status: string;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed with status ${response.status}`);
  return payload as T;
}

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;

  const [formData, setFormData] = useState<FormData>({ fullName: '', phone: '', email: '', companyName: '', status: 'new' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const data = await fetchJson<any>(`/api/mysql/leads/${encodeURIComponent(leadId)}`);
        setFormData({
          fullName: data.full_name || data.fullName || '',
          phone: data.phone || '',
          email: data.email || '',
          companyName: data.company_name || data.companyName || '',
          status: data.status || 'new',
        });
      } catch (err: any) {
        setSubmitError(err?.message || 'Failed to load lead.');
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSubmitError(null);
    try {
      await fetchJson(`/api/mysql/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          companyName: formData.companyName.trim() || null,
          status: formData.status,
        }),
      });
      router.push(`/leads/${leadId}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to update lead.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 lg:px-8 max-w-3xl mx-auto"><div className="bg-white border border-border rounded-xl shadow-sm p-6 animate-pulse space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-lg" />)}</div></div>;
  }

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/leads/${leadId}`)} className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-600 text-foreground">Edit Lead</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update lead information</p>
        </div>
      </div>

      {submitError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{submitError}</div>}

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-4">
        <input className="w-full px-3 py-2.5 rounded-lg border border-border" value={formData.fullName} onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))} placeholder="Full name" />
        <input className="w-full px-3 py-2.5 rounded-lg border border-border" value={formData.companyName} onChange={e => setFormData(f => ({ ...f, companyName: e.target.value }))} placeholder="Company name" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className="w-full px-3 py-2.5 rounded-lg border border-border" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
          <input className="w-full px-3 py-2.5 rounded-lg border border-border" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
        </div>
        <select className="w-full px-3 py-2.5 rounded-lg border border-border" value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push(`/leads/${leadId}`)} className="px-4 py-2 rounded-lg border border-border bg-white">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
