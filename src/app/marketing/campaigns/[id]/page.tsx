'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Film, Users, DollarSign, Image as ImageIcon, Video, Plus, Loader2, Mail, Phone, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent_amount: number;
  start_date: string | null;
}

interface Creative {
  id: string;
  file_url: string;
  type: string | null;
  title: string | null;
  description: string | null;
  file_name: string | null;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  creative_id: string | null;
  campaign_creatives?: { title: string | null; type: string | null } | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  amount: number;
  paid_amount: number | null;
  final_amount: number | null;
  status: string;
  companies?: { name: string } | null;
}

type TabId = 'overview' | 'creatives' | 'leads' | 'revenue';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
  ended: 'bg-red-100 text-red-700',
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-indigo-100 text-indigo-700',
  proposal: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusColors[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ campaign, leadsCount, totalRevenue, loading }: {
  campaign: Campaign;
  leadsCount: number;
  totalRevenue: number;
  loading: boolean;
}) {
  const cards = [
    { label: 'Campaign Name', value: campaign.name, icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Leads', value: loading ? '...' : String(leadsCount), icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Total Revenue', value: loading ? '...' : `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
              <p className="text-lg font-semibold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Details */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Campaign Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Platform</p>
            <p className="font-medium text-foreground">{campaign.platform}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <StatusBadge status={campaign.status} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="font-medium text-foreground">₹{Number(campaign.budget).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Start Date</p>
            <p className="font-medium text-foreground">{campaign.start_date || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreativesTab({ campaignId, creatives, loading }: { campaignId: string; creatives: Creative[]; loading: boolean }) {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{creatives.length} creative{creatives.length !== 1 ? 's' : ''} found</p>
        <Link
          href="/marketing/creatives"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} /> Add Creative
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : creatives.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-12 text-center">
          <Film size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No creatives for this campaign yet.</p>
          <Link href="/marketing/creatives" className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline">
            <Plus size={12} /> Upload a creative
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {creatives.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-border overflow-hidden group">
              <div className="relative aspect-video bg-muted/30 overflow-hidden">
                {c.type === 'video' ? (
                  <video
                    src={c.file_url}
                    className="w-full h-full object-cover"
                    muted
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0; }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.file_url}
                    alt={c.title || c.file_name || 'Creative asset'}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-black/60 text-white">
                    {c.type === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                    {c.type || 'image'}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-foreground truncate">{c.title || c.file_name || 'Untitled'}</p>
                {c.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadsTab({ campaignId, leads, loading }: { campaignId: string; leads: Lead[]; loading: boolean }) {

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Leads</h3>
        <span className="text-xs text-muted-foreground">{leads.length} total</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <div className="py-12 text-center">
          <Users size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No leads for this campaign yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Name', 'Company', 'Status', 'Creative', 'Contact'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                      {lead.name}
                      <ExternalLink size={11} className="text-muted-foreground/50" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company_name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3">
                    {lead.campaign_creatives ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
                        {lead.campaign_creatives.type === 'video' ? <Video size={10} /> : <ImageIcon size={10} />}
                        {lead.campaign_creatives.title || 'Untitled'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Mail size={12} /> {lead.email}
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Phone size={12} /> {lead.phone}
                        </a>
                      )}
                      {!lead.email && !lead.phone && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevenueTab({ campaignId, invoices, loading }: { campaignId: string; invoices: Invoice[]; loading: boolean }) {

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.final_amount || inv.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Invoiced', value: `₹${totalInvoiced.toLocaleString()}`, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Collected', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-green-600 bg-green-50' },
          { label: 'Total Invoices', value: String(invoices.length), color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-semibold ${color.split(' ')[0]}`}>{loading ? '...' : value}</p>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No invoices linked to this campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Invoice #', 'Company', 'Date', 'Amount', 'Paid', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{inv.invoice_number || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.companies?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.invoice_date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">₹{Number(inv.final_amount || inv.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-green-700">₹{Number(inv.paid_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'creatives', label: 'Creatives', icon: Film },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const { session, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const companyId = user?.companyId || user?.company_id;

  const fetchCampaign = useCallback(async () => {
    if (!campaignId || !companyId) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/mysql/marketing/campaigns/${campaignId}?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign details');
      
      const data = await response.json();
      setCampaign(data.campaign);
      setLeads(data.leads || []);
      setCreatives(data.creatives || []);
      setInvoices(data.invoices || []);
      setLeadsCount(data.stats?.leadsCount || 0);
      setTotalRevenue(data.stats?.totalRevenue || 0);
    } catch (err) {
      console.error('Campaign detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, companyId]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  if (!loading && !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 50%, #1a2744 100%)' }}>
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">Campaign not found</p>
          <button onClick={() => router.push('/marketing')} className="text-sm text-blue-400 hover:underline">
            ← Back to Marketing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 50%, #1a2744 100%)' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-screen-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/marketing"
            className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
            style={{ color: 'rgba(148,163,184,0.7)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#93c5fd'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.7)'; }}
          >
            <ArrowLeft size={13} /> Back to Marketing
          </Link>

          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {loading ? 'Loading...' : campaign?.name || 'Campaign'}
            </h1>
            {campaign && <StatusBadge status={campaign.status} />}
          </div>
          <p className="text-sm mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {campaign?.platform || ''}
          </p>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150"
                  style={
                    isActive
                      ? { color: '#93c5fd', background: 'rgba(59,130,246,0.12)', borderBottom: '2px solid #3b82f6' }
                      : { color: 'rgba(148,163,184,0.7)', borderBottom: '2px solid transparent' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.7)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : campaign ? (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                campaign={campaign}
                leadsCount={leadsCount}
                totalRevenue={totalRevenue}
                loading={false}
              />
            )}
            {activeTab === 'creatives' && <CreativesTab campaignId={campaignId} creatives={creatives} loading={loading} />}
            {activeTab === 'leads' && <LeadsTab campaignId={campaignId} leads={leads} loading={loading} />}
            {activeTab === 'revenue' && <RevenueTab campaignId={campaignId} invoices={invoices} loading={loading} />}
          </>
        ) : null}
      </div>
    </div>
  );
}
