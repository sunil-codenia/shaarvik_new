'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Plus, RefreshCw, Filter, ExternalLink, Image as ImageIcon, Video, FileText } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
}

interface Creative {
  id: string;
  name: string;
  type: string | null;
  campaign_id: string | null;
  platform: string | null;
  creative_url: string | null;
  headline: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  campaigns?: { name: string } | null;
}

interface CreativeForm {
  name: string;
  type: string;
  campaign_id: string;
  platform: string;
  creative_url: string;
  headline: string;
  description: string;
  status: string;
}

const PLATFORMS = ['facebook', 'google', 'manual'];
const TYPES = ['image', 'video', 'copy'];
const STATUSES = ['active', 'paused'];

const typeIcon = (type: string | null) => {
  if (type === 'video') return <Video size={12} />;
  if (type === 'copy') return <FileText size={12} />;
  return <ImageIcon size={12} />;
};

const typeColor = (type: string | null) => {
  if (type === 'video') return { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' };
  if (type === 'copy') return { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' };
  return { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: 'rgba(59,130,246,0.3)' };
};

const platformColor = (platform: string | null) => {
  if (platform === 'facebook') return { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa' };
  if (platform === 'google') return { bg: 'rgba(234,179,8,0.1)', color: '#fbbf24' };
  return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' };
};

const statusColor = (status: string | null) => {
  if (status === 'active') return { bg: 'rgba(16,185,129,0.12)', color: '#34d399', border: 'rgba(16,185,129,0.25)' };
  return { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' };
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreativesPage() {
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCampaignId, setFilterCampaignId] = useState('');

  const [form, setForm] = useState<CreativeForm>({
    name: '',
    type: 'image',
    campaign_id: '',
    platform: 'manual',
    creative_url: '',
    headline: '',
    description: '',
    status: 'active',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreativeForm, string>>>({});

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, creativesRes] = await Promise.all([
        supabase.from('campaigns').select('id, name').order('name'),
        supabase
          .from('creatives')
          .select('*, campaigns(name)')
          .order('created_at', { ascending: false }),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (creativesRes.error) throw creativesRes.error;

      setCampaigns(campaignsRes.data || []);
      setCreatives(creativesRes.data || []);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Form Handlers ─────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof CreativeForm]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof CreativeForm, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.campaign_id) errs.campaign_id = 'Campaign is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setForm({ name: '', type: 'image', campaign_id: '', platform: 'manual', creative_url: '', headline: '', description: '', status: 'active' });
    setFormErrors({});
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('creatives').insert({
        name: form.name.trim(),
        type: form.type,
        campaign_id: form.campaign_id,
        platform: form.platform,
        creative_url: form.creative_url.trim() || null,
        headline: form.headline.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
      });
      if (insertError) throw insertError;
      setSuccess('Creative added successfully!');
      resetForm();
      fetchData();
    } catch (err: any) {
      setError('Failed to save creative: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this creative?')) return;
    const { error: delError } = await supabase.from('creatives').delete().eq('id', id);
    if (delError) { setError('Delete failed: ' + delError.message); return; }
    setCreatives(prev => prev.filter(c => c.id !== id));
    setSuccess('Creative deleted.');
  };

  // ─── Filtered Creatives ────────────────────────────────────────────────────

  const filteredCreatives = filterCampaignId
    ? creatives.filter(c => c.campaign_id === filterCampaignId)
    : creatives;

  const selectedCampaignName = filterCampaignId
    ? campaigns.find(c => c.id === filterCampaignId)?.name
    : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Creatives</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Manage creative assets — unlimited creatives per campaign
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', boxShadow: '0 2px 12px rgba(59,130,246,0.4)' }}
            >
              <Plus size={15} />
              Add Creative
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><X size={14} /></button>
          </div>
        )}

        {/* Add Creative Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-lg font-semibold text-white mb-5">Add New Creative</h2>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Campaign — shown on top */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>
                  Campaign <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  name="campaign_id"
                  value={form.campaign_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${formErrors.campaign_id ? '#f87171' : 'rgba(255,255,255,0.1)'}`, color: form.campaign_id ? '#e2e8f0' : 'rgba(148,163,184,0.5)' }}
                >
                  <option value="" disabled style={{ background: '#0f1f3d' }}>Select a campaign</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#0f1f3d', color: '#e2e8f0' }}>{c.name}</option>
                  ))}
                </select>
                {formErrors.campaign_id && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{formErrors.campaign_id}</p>}
                {form.campaign_id && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Campaign: <span style={{ color: '#93c5fd' }}>{campaigns.find(c => c.id === form.campaign_id)?.name}</span>
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>
                  Creative Name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Summer Sale Banner v1"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${formErrors.name ? '#f87171' : 'rgba(255,255,255,0.1)'}`, color: '#e2e8f0' }}
                />
                {formErrors.name && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{formErrors.name}</p>}
              </div>

              {/* Type + Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    {TYPES.map(t => <option key={t} value={t} style={{ background: '#0f1f3d' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Platform</label>
                  <select
                    name="platform"
                    value={form.platform}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p} style={{ background: '#0f1f3d' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Status + Creative URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s} style={{ background: '#0f1f3d' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Creative URL <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>(optional)</span></label>
                  <input
                    type="url"
                    name="creative_url"
                    value={form.creative_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                  />
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Headline <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>(optional)</span></label>
                <input
                  type="text"
                  name="headline"
                  value={form.headline}
                  onChange={handleChange}
                  placeholder="e.g. Get 50% Off This Summer!"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Description <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '11px' }}>(optional)</span></label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Brief description of this creative..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff' }}
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Plus size={14} /> Add Creative</>}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign Filter */}
        <div className="mb-6 flex items-center gap-3">
          <Filter size={14} style={{ color: 'rgba(148,163,184,0.6)' }} />
          <select
            value={filterCampaignId}
            onChange={(e) => setFilterCampaignId(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: filterCampaignId ? '#e2e8f0' : 'rgba(148,163,184,0.6)' }}
          >
            <option value="" style={{ background: '#0f1f3d' }}>All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#0f1f3d', color: '#e2e8f0' }}>{c.name}</option>
            ))}
          </select>
          {filterCampaignId && (
            <button
              onClick={() => setFilterCampaignId('')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <X size={11} /> Clear
            </button>
          )}
          <span className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {filteredCreatives.length} creative{filteredCreatives.length !== 1 ? 's' : ''}
            {selectedCampaignName ? ` for "${selectedCampaignName}"` : ' total'}
          </span>
        </div>

        {/* Campaign Name Banner when filtered */}
        {selectedCampaignName && (
          <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span className="text-sm font-medium" style={{ color: '#93c5fd' }}>Campaign:</span>
            <span className="text-sm text-white font-semibold">{selectedCampaignName}</span>
          </div>
        )}

        {/* Creatives List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <ImageIcon size={28} style={{ color: '#3b82f6' }} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">No creatives found</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                {filterCampaignId ? 'No creatives for this campaign yet.' : 'Add your first creative to get started.'}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <Plus size={14} /> Add Creative
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Campaign</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Type</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Platform</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Headline</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>URL</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.7)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreatives.map((creative, idx) => {
                  const tc = typeColor(creative.type);
                  const pc = platformColor(creative.platform);
                  const sc = statusColor(creative.status);
                  return (
                    <tr
                      key={creative.id}
                      style={{ borderBottom: idx < filteredCreatives.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: 'transparent' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-white">{creative.name}</p>
                        {creative.description && (
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(148,163,184,0.5)' }}>{creative.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: '#93c5fd' }}>
                          {creative.campaigns?.name || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                          {typeIcon(creative.type)}
                          {creative.type || 'image'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                          style={{ background: pc.bg, color: pc.color }}>
                          {creative.platform || 'manual'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                          {creative.headline || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {creative.status || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {creative.creative_url ? (
                          <a href={creative.creative_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs transition-colors"
                            style={{ color: '#60a5fa' }}>
                            <ExternalLink size={11} /> View
                          </a>
                        ) : (
                          <span style={{ color: 'rgba(148,163,184,0.3)' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(creative.id)}
                          className="text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
