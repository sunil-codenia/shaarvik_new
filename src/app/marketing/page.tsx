'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, DollarSign, Users, Zap, Plus, Activity, RefreshCw, CheckCircle, Clock, PauseCircle, XCircle, ChevronRight  } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import debug from '@/lib/debug';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spentAmount: number;
  leadsCount: number;
  revenue: number;
  roi: number;
}

interface DashboardStats {
  activeCampaigns: number;
  totalLeads: number;
  totalRevenue: number;
  blendedROI: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:  { label: 'Active',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  icon: CheckCircle },
  paused:  { label: 'Paused',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: PauseCircle },
  draft:   { label: 'Draft',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Clock },
  ended:   { label: 'Ended',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig['draft'];
  const Ico = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Ico size={10} />
      {cfg.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, icon: Ico, color, loading,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Ico size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium mb-0.5 truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</p>
        {loading ? (
          <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <p className="text-2xl font-bold text-white truncate">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const router = useRouter();
  const { session, user } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0, totalLeads: 0, totalRevenue: 0, blendedROI: 0,
  });

  const companyId = user?.companyId || user?.company_id;

  const fetchData = async (isRefresh = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/mysql/marketing/stats?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setCampaigns(data.campaigns || []);
      setStats(data.stats || {
        activeCampaigns: 0, totalLeads: 0, totalRevenue: 0, blendedROI: 0,
      });
    } catch (err: any) {
      debug.dbError('marketing-dashboard', 'FETCH', 'marketing/stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      setAuthChecked(true);
      fetchData();
    } else if (session === null) {
      // If session check is done and no session, middleware handles protection
      // but we can add a fallback here if needed.
    }
  }, [session, companyId]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>Checking authentication...</div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="p-6 space-y-6">

      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Live overview of your campaigns, leads, and revenue
        </p>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Essential KPIs — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Campaigns" value={String(stats.activeCampaigns)} icon={Activity} color="#4ade80" loading={loading} />
        <KPICard label="Total Leads" value={String(stats.totalLeads)} icon={Users} color="#a78bfa" loading={loading} />
        <KPICard label="Total Revenue" value={loading ? '…' : fmtINR(stats.totalRevenue)} icon={DollarSign} color="#34d399" loading={loading} />
        <KPICard
          label="Blended ROI"
          value={loading ? '…' : stats.blendedROI > 0 ? `${stats.blendedROI.toFixed(1)}x` : '—'}
          icon={Zap}
          color="#f472b6"
          loading={loading}
        />
      </div>

      {/* Campaign Builder Hero CTA */}
      <div
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.14) 100%)',
          border: '1px solid rgba(59,130,246,0.3)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <Megaphone size={26} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Campaign Builder</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Build multi-platform campaigns — Google, Meta, LinkedIn and more — step by step with AI validation.
            </p>
          </div>
        </div>
        <Link
          href="/marketing/campaign-builder"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 22px rgba(59,130,246,0.6)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(59,130,246,0.4)'; }}
        >
          <Plus size={16} />
          New Campaign
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Active Campaigns Status Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="text-sm font-semibold text-white">Active Campaign Status</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Currently running campaigns — live data
            </p>
          </div>
          <Link
            href="/marketing/campaign-builder"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.15)'; }}
          >
            <Plus size={12} /> Add Campaign
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Loading campaigns…
            </div>
          ) : activeCampaigns.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Megaphone size={32} className="mx-auto mb-3" style={{ color: 'rgba(148,163,184,0.3)' }} />
              <p className="text-sm font-medium text-white mb-1">No active campaigns</p>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>
                Launch your first campaign using the Campaign Builder above
              </p>
              <Link
                href="/marketing/campaign-builder"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}
              >
                <Plus size={14} /> Open Campaign Builder
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Campaign', 'Platform', 'Status', 'Budget', 'Spent', 'Leads', 'Revenue', 'ROI'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(148,163,184,0.5)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeCampaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: i < activeCampaigns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/marketing/campaigns/${c.id}`}
                        className="font-medium text-white hover:text-blue-400 transition-colors"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      {c.platform}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'rgba(148,163,184,0.8)' }}>
                      {fmtINR(c.budget)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      {fmtINR(c.spentAmount)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-white">
                      {c.leadsCount}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm" style={{ color: '#4ade80' }}>
                      {fmtINR(c.revenue)}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.spentAmount > 0 ? (
                        <span
                          className="font-bold text-sm"
                          style={{
                            color: c.roi >= 2 ? '#4ade80' : c.roi >= 1 ? '#fbbf24' : '#f87171',
                          }}
                        >
                          {c.roi.toFixed(1)}x
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(148,163,184,0.4)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
