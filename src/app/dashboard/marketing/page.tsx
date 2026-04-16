'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { RefreshCw, Package, Megaphone, IndianRupee, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Star, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignRevenue {
  campaign: string;
  total_revenue: number;
}

interface ProductRevenue {
  product: string;
  revenue: number;
}

interface CrossRow {
  campaign: string;
  product: string;
  revenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#14b8a6', '#f97316', '#ef4444', '#84cc16',
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-xl"
      style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}
    >
      <p className="font-semibold mb-1 text-white">{label}</p>
      <p style={{ color: '#93c5fd' }}>{fmtINR(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium mb-0.5 truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</p>
        <p className="text-xl font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h2 className="text-base font-semibold text-white mb-0.5">{title}</h2>
      {subtitle && (
        <p className="text-xs mb-5" style={{ color: 'rgba(148,163,184,0.6)' }}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-56 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
      No data available
    </div>
  );
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

type InsightPriority = 'critical' | 'warning' | 'healthy';

interface Insight {
  type: 'info' | 'warning' | 'success';
  priority: InsightPriority;
  icon: React.ElementType;
  title: string;
  message: string;
}

function getPriority(pct: number): InsightPriority {
  if (pct > 70) return 'critical';
  if (pct >= 40) return 'warning';
  return 'healthy';
}

const priorityLabel: Record<InsightPriority, string> = {
  critical: '🔴 Critical',
  warning: '🟡 Warning',
  healthy: '🟢 Healthy',
};

function computeInsights(
  campaignData: CampaignRevenue[],
  productData: ProductRevenue[],
): Insight[] {
  const insights: Insight[] = [];
  const totalRevenue = campaignData.reduce((s, r) => s + r.total_revenue, 0);
  const totalProductRevenue = productData.reduce((s, r) => s + r.revenue, 0);

  if (totalRevenue === 0) return insights;

  // 1. Top Campaign
  if (campaignData.length > 0) {
    const top = campaignData[0];
    const pct = Math.round((top.total_revenue / totalRevenue) * 100);
    const priority = getPriority(pct);
    insights.push({
      type: 'success',
      priority,
      icon: TrendingUp,
      title: 'Top Campaign',
      message: `${top.campaign} generates ${pct}% of total revenue. Consider scaling this channel.`,
    });
  }

  // 2. Worst Campaign (exclude Organic)
  const paidCampaigns = campaignData.filter((c) => c.campaign !== 'Organic');
  if (paidCampaigns.length > 0) {
    const worst = paidCampaigns[paidCampaigns.length - 1];
    const pct = Math.round((worst.total_revenue / totalRevenue) * 100);
    const priority = getPriority(pct);
    insights.push({
      type: 'warning',
      priority,
      icon: TrendingDown,
      title: 'Underperforming Campaign',
      message: `${worst.campaign} contributes only ${pct}%. Optimize or stop spending.`,
    });
  }

  // 3. Top Product
  if (productData.length > 0 && totalProductRevenue > 0) {
    const topProd = productData[0];
    const pct = Math.round((topProd.revenue / totalProductRevenue) * 100);
    const priority = getPriority(pct);
    insights.push({
      type: 'success',
      priority,
      icon: Star,
      title: 'Top Product',
      message: `${topProd.product} contributes ${pct}% revenue. Focus on upselling and expansion.`,
    });
  }

  // 4. Organic Dependency
  const organicRevenue = campaignData.find((c) => c.campaign === 'Organic')?.total_revenue ?? 0;
  const organicPct = Math.round((organicRevenue / totalRevenue) * 100);
  if (organicPct > 40) {
    const priority = getPriority(organicPct);
    insights.push({
      type: 'warning',
      priority,
      icon: AlertTriangle,
      title: 'Organic Dependency',
      message: `High dependency on organic (${organicPct}%). Consider strengthening paid campaigns.`,
    });
  }

  // 5. Revenue Concentration Risk
  if (campaignData.length > 0) {
    const topRevenue = campaignData[0].total_revenue;
    const topPct = Math.round((topRevenue / totalRevenue) * 100);
    if (topPct > 70) {
      insights.push({
        type: 'warning',
        priority: 'critical',
        icon: Zap,
        title: 'Revenue Risk',
        message: `High concentration risk: ${topPct}% revenue from one source.`,
      });
    }
  }

  return insights;
}

const insightStyles = {
  critical: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.30)',
    iconBg: 'rgba(239,68,68,0.18)',
    iconColor: '#f87171',
    textColor: '#fecaca',
    labelColor: '#f87171',
    titleColor: '#fca5a5',
  },
  warning: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.30)',
    iconBg: 'rgba(245,158,11,0.18)',
    iconColor: '#fbbf24',
    textColor: '#fde68a',
    labelColor: '#fbbf24',
    titleColor: '#fcd34d',
  },
  healthy: {
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.30)',
    iconBg: 'rgba(16,185,129,0.18)',
    iconColor: '#34d399',
    textColor: '#a7f3d0',
    labelColor: '#34d399',
    titleColor: '#6ee7b7',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = insightStyles[insight.priority];
  const IconComp = insight.icon;
  return (
    <div
      className="flex flex-col gap-3 rounded-xl px-4 py-4"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: s.iconBg }}
          >
            <IconComp size={16} style={{ color: s.iconColor }} />
          </div>
          <p className="text-sm font-bold" style={{ color: s.titleColor }}>
            {insight.title}
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: s.iconBg, color: s.labelColor }}
        >
          {priorityLabel[insight.priority]}
        </span>
      </div>
      <p className="text-sm font-medium leading-relaxed" style={{ color: s.textColor }}>
        {insight.message}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<CampaignRevenue[]>([]);
  const [productData, setProductData] = useState<ProductRevenue[]>([]);
  const [crossData, setCrossData] = useState<CrossRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // ── Query 1: Revenue by Campaign ──────────────────────────────────────
      // Equivalent to:
      // SELECT COALESCE(camp.name, 'Organic') as campaign, SUM(i.amount) as total_revenue
      // FROM invoices i JOIN companies c ON i.company_id = c.id
      // LEFT JOIN campaigns camp ON c.campaign_id = camp.id
      // GROUP BY camp.name
      const { data: invoicesRaw, error: invErr } = await supabase
        .from('invoices')
        .select(`
          amount,
          final_amount,
          paid_amount,
          company_id,
          product_id,
          companies!inner (
            id,
            campaign_id,
            campaigns (
              id,
              name
            )
          ),
          products (
            id,
            name
          )
        `);

      if (invErr) {
        console.error('Marketing dashboard fetch error:', invErr.message);
        setLoading(false);
        return;
      }

      const rows = (invoicesRaw || []) as any[];

      // ── Aggregate Revenue by Campaign ─────────────────────────────────────
      const campaignMap: Record<string, number> = {};
      rows.forEach((inv) => {
        const campaignName: string =
          inv.companies?.campaigns?.name ?? 'Organic';
        const rev = Number(inv.paid_amount ?? inv.final_amount ?? inv.amount ?? 0);
        campaignMap[campaignName] = (campaignMap[campaignName] ?? 0) + rev;
      });

      const campaignArr: CampaignRevenue[] = Object.entries(campaignMap)
        .map(([campaign, total_revenue]) => ({ campaign, total_revenue }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      // ── Aggregate Revenue by Product ──────────────────────────────────────
      const productMap: Record<string, number> = {};
      rows.forEach((inv) => {
        const productName: string = inv.products?.name ?? 'Unknown Product';
        const rev = Number(inv.paid_amount ?? inv.final_amount ?? inv.amount ?? 0);
        productMap[productName] = (productMap[productName] ?? 0) + rev;
      });

      const productArr: ProductRevenue[] = Object.entries(productMap)
        .map(([product, revenue]) => ({ product, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── Campaign × Product Cross Table ────────────────────────────────────
      const crossMap: Record<string, number> = {};
      rows.forEach((inv) => {
        const campaignName: string =
          inv.companies?.campaigns?.name ?? 'Organic';
        const productName: string = inv.products?.name ?? 'Unknown Product';
        const key = `${campaignName}||${productName}`;
        const rev = Number(inv.paid_amount ?? inv.final_amount ?? inv.amount ?? 0);
        crossMap[key] = (crossMap[key] ?? 0) + rev;
      });

      const crossArr: CrossRow[] = Object.entries(crossMap)
        .map(([key, revenue]) => {
          const [campaign, product] = key.split('||');
          return { campaign, product, revenue };
        })
        .sort((a, b) => b.revenue - a.revenue);

      setCampaignData(campaignArr);
      setProductData(productArr);
      setCrossData(crossArr);
    } catch (err: any) {
      console.error('Marketing dashboard error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = campaignData.reduce((s, r) => s + r.total_revenue, 0);
  const topCampaign = campaignData[0]?.campaign ?? '—';
  const topProduct = productData[0]?.product ?? '—';

  const insights = computeInsights(campaignData, productData);

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 max-w-screen-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Marketing Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Revenue insights by campaign and product
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(59,130,246,0.15)',
              color: '#93c5fd',
              border: '1px solid rgba(59,130,246,0.25)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard label="Total Revenue" value={fmtINR(totalRevenue)} icon={IndianRupee} color="#3b82f6" />
          <KPICard label="Top Campaign" value={topCampaign} icon={Megaphone} color="#10b981" />
          <KPICard label="Top Product" value={topProduct} icon={Package} color="#8b5cf6" />
        </div>

        {/* AI Insights Section */}
        {!loading && insights.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.18)' }}
              >
                <Lightbulb size={16} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Actionable Insights</h2>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                  Decision-making insights from your revenue data
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Section 1 & 2: Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 1: Revenue by Campaign */}
          <SectionCard title="Revenue by Campaign" subtitle='NULL campaign shown as "Organic"'>
            {loading ? <Spinner /> : campaignData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={campaignData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="campaign"
                    tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total_revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {campaignData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {/* Section 2: Revenue by Product */}
          <SectionCard title="Revenue by Product" subtitle="Sorted by highest revenue">
            {loading ? <Spinner /> : productData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={productData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="product"
                    tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {productData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Section 3: Campaign vs Product Table */}
        <SectionCard title="Campaign vs Product" subtitle="Revenue breakdown by campaign and product — sorted by highest revenue">
          {loading ? (
            <Spinner />
          ) : crossData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      Campaign
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      Product
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {crossData.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: row.campaign === 'Organic' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                            color: row.campaign === 'Organic' ? '#34d399' : '#93c5fd',
                          }}
                        >
                          {row.campaign}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{row.product}</td>
                      <td className="py-3 px-4 text-right font-semibold" style={{ color: '#93c5fd' }}>
                        {fmtINR(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <td colSpan={2} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      Total
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">
                      {fmtINR(crossData.reduce((s, r) => s + r.revenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>

      </div>
    </>
  );
}
