'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Link2, RefreshCw, AlertTriangle, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string | null;
  account_id: string | null;
  status: string;
  connected_at: string;
}

interface Campaign {
  id: string;
  name: string;
  platforms: string[];
  status: string;
  google_sync_status: string | null;
  meta_sync_status: string | null;
  linkedin_sync_status: string | null;
  google_sync_error: string | null;
  meta_sync_error: string | null;
  linkedin_sync_error: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  created_at: string;
  total_budget: number | null;
  daily_budget: number | null;
  objective: string | null;
}

interface ABTest {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  impressions_a: number;
  impressions_b: number;
  clicks_a: number;
  clicks_b: number;
  conversions_a: number;
  conversions_b: number;
  winner: string | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  google: '#fbbf24',
  meta: '#60a5fa',
  linkedin: '#818cf8',
};

function SyncBadge({ status, error }: { status: string | null; error: string | null }) {
  if (!status || status === 'pending') return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.1)', color: 'rgba(148,163,184,0.6)' }}>Pending</span>;
  if (status === 'synced') return <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}><CheckCircle2 size={10} /> Synced</span>;
  if (status === 'error') return (
    <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }} title={error || ''}>
      <XCircle size={10} /> Error
    </span>
  );
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>{status}</span>;
}

function SmartAlert({ campaign }: { campaign: Campaign }) {
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
  const alerts: { msg: string; type: 'warn' | 'info' }[] = [];

  if (campaign.impressions > 1000 && ctr < 1) alerts.push({ msg: `Low CTR: ${ctr.toFixed(2)}% — consider refreshing creatives`, type: 'warn' });
  if (cpc > 500) alerts.push({ msg: `High CPC: ₹${cpc.toFixed(0)} — review bidding strategy`, type: 'warn' });
  if (campaign.spend > 0 && campaign.total_budget && campaign.spend >= campaign.total_budget * 0.9) {
    alerts.push({ msg: 'Budget nearly exhausted (90%+ spent)', type: 'warn' });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: a.type === 'warn' ? '#fbbf24' : '#60a5fa' }}>
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          {a.msg}
        </div>
      ))}
    </div>
  );
}

export default function CampaignDashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'accounts' | 'ab'>('campaigns');
  const [connectForm, setConnectForm] = useState({ platform: 'google', account_name: '', account_id: '', access_token: '' });
  const [connecting, setConnecting] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [campsRes, accsRes, abRes] = await Promise.all([
      supabase.from('ucb_campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('ucb_platform_accounts').select('*').eq('user_id', user.id).order('connected_at', { ascending: false }),
      supabase.from('ucb_ab_tests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setCampaigns(campsRes.data || []);
    setAccounts(accsRes.data || []);
    setAbTests(abRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const connectAccount = async () => {
    if (!user || !connectForm.platform || !connectForm.account_name) return;
    setConnecting(true);
    await supabase.from('ucb_platform_accounts').insert({
      user_id: user.id,
      platform: connectForm.platform,
      account_name: connectForm.account_name,
      account_id: connectForm.account_id,
      access_token: connectForm.access_token,
      status: 'connected',
    });
    setConnectForm({ platform: 'google', account_name: '', account_id: '', access_token: '' });
    setShowConnectForm(false);
    setConnecting(false);
    fetchData();
  };

  const disconnectAccount = async (id: string) => {
    await supabase.from('ucb_platform_accounts').update({ status: 'disconnected' }).eq('id', id);
    fetchData();
  };

  const simulateSync = async (campaignId: string) => {
    setSyncingId(campaignId);
    await new Promise((r) => setTimeout(r, 1500));
    await supabase.from('ucb_campaigns').update({
      google_sync_status: 'synced',
      meta_sync_status: 'synced',
      linkedin_sync_status: 'synced',
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId);
    setSyncingId(null);
    fetchData();
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Campaign Dashboard</h2>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Monitor sync status, performance metrics, and A/B tests.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.7)' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['campaigns', 'accounts', 'ab'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize"
            style={{
              background: activeTab === t ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeTab === t ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: activeTab === t ? '#93c5fd' : 'rgba(148,163,184,0.6)',
            }}
          >
            {t === 'ab' ? 'A/B Tests' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: 'rgba(148,163,184,0.4)' }} />
        </div>
      ) : (
        <>
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  <Zap size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No campaigns yet. Create your first campaign above.</p>
                </div>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{c.name}</h4>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize"
                            style={{
                              background: c.status === 'active' ? 'rgba(16,185,129,0.12)' : c.status === 'draft' ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.12)',
                              color: c.status === 'active' ? '#34d399' : c.status === 'draft' ? '#94a3b8' : '#f87171',
                            }}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                          {c.objective?.replace(/_/g, ' ')} · {c.platforms?.join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => simulateSync(c.id)}
                        disabled={syncingId === c.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
                      >
                        {syncingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Sync
                      </button>
                    </div>

                    {/* Platform Sync Status */}
                    <div className="flex flex-wrap gap-3 mb-3">
                      {(c.platforms || []).map((p) => (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="text-xs font-medium capitalize" style={{ color: PLATFORM_COLORS[p] || '#94a3b8' }}>{p}</span>
                          <SyncBadge
                            status={p === 'google' ? c.google_sync_status : p === 'meta' ? c.meta_sync_status : c.linkedin_sync_status}
                            error={p === 'google' ? c.google_sync_error : p === 'meta' ? c.meta_sync_error : c.linkedin_sync_error}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Impressions', value: c.impressions?.toLocaleString() || '0' },
                        { label: 'Clicks', value: c.clicks?.toLocaleString() || '0' },
                        { label: 'CTR', value: c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(2)}%` : '0%' },
                        { label: 'Spend', value: `₹${(c.spend || 0).toLocaleString()}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-xs mb-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</p>
                          <p className="text-sm font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    <SmartAlert campaign={c} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConnectForm(!showConnectForm)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}
                >
                  <Link2 size={14} /> Connect Account
                </button>
              </div>

              {showConnectForm && (
                <div
                  className="rounded-2xl p-5 space-y-3"
                  style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <h4 className="text-sm font-semibold text-white">Connect Ad Account</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Platform</label>
                      <select
                        style={inputStyle}
                        value={connectForm.platform}
                        onChange={(e) => setConnectForm({ ...connectForm, platform: e.target.value })}
                      >
                        <option value="google">Google Ads</option>
                        <option value="meta">Meta Ads</option>
                        <option value="linkedin">LinkedIn Ads</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Account Name</label>
                      <input style={inputStyle} value={connectForm.account_name} onChange={(e) => setConnectForm({ ...connectForm, account_name: e.target.value })} placeholder="My Google Ads Account" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Account ID</label>
                      <input style={inputStyle} value={connectForm.account_id} onChange={(e) => setConnectForm({ ...connectForm, account_id: e.target.value })} placeholder="123-456-7890" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Access Token</label>
                      <input style={{ ...inputStyle, fontFamily: 'monospace' }} type="password" value={connectForm.access_token} onChange={(e) => setConnectForm({ ...connectForm, access_token: e.target.value })} placeholder="••••••••••••" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={connectAccount}
                      disabled={connecting}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                    >
                      {connecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                    <button type="button" onClick={() => setShowConnectForm(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {accounts.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  <Link2 size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No accounts connected. Connect once, reuse forever.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: `${PLATFORM_COLORS[a.platform] || '#94a3b8'}22`, color: PLATFORM_COLORS[a.platform] || '#94a3b8' }}
                        >
                          {a.platform.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{a.account_name}</p>
                          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                            {a.platform} · ID: {a.account_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: a.status === 'connected' ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.1)',
                            color: a.status === 'connected' ? '#34d399' : '#94a3b8',
                          }}
                        >
                          {a.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => disconnectAccount(a.id)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* A/B Tests Tab */}
          {activeTab === 'ab' && (
            <div className="space-y-3">
              {abTests.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  <p className="text-sm">No A/B tests yet. Enable A/B testing when creating a campaign.</p>
                </div>
              ) : (
                abTests.map((t) => {
                  const ctrA = t.impressions_a > 0 ? ((t.clicks_a / t.impressions_a) * 100).toFixed(2) : '0.00';
                  const ctrB = t.impressions_b > 0 ? ((t.clicks_b / t.impressions_b) * 100).toFixed(2) : '0.00';
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl p-5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-white">{t.name}</h4>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: t.status === 'running' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)',
                            color: t.status === 'running' ? '#60a5fa' : '#34d399',
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {(['A', 'B'] as const).map((v) => {
                          const imp = v === 'A' ? t.impressions_a : t.impressions_b;
                          const clk = v === 'A' ? t.clicks_a : t.clicks_b;
                          const conv = v === 'A' ? t.conversions_a : t.conversions_b;
                          const ctr = v === 'A' ? ctrA : ctrB;
                          const isWinner = t.winner === v;
                          return (
                            <div
                              key={v}
                              className="rounded-xl p-4"
                              style={{
                                background: isWinner ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isWinner ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-bold" style={{ color: isWinner ? '#34d399' : '#94a3b8' }}>Variant {v}</span>
                                {isWinner && <CheckCircle2 size={14} className="text-emerald-400" />}
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between"><span style={{ color: 'rgba(148,163,184,0.5)' }}>Impressions</span><span className="text-white">{imp.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'rgba(148,163,184,0.5)' }}>Clicks</span><span className="text-white">{clk.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span style={{ color: 'rgba(148,163,184,0.5)' }}>CTR</span><span className="text-white">{ctr}%</span></div>
                                <div className="flex justify-between"><span style={{ color: 'rgba(148,163,184,0.5)' }}>Conversions</span><span className="text-white">{conv}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
