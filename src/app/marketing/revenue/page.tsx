'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, BarChart2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignRevenue {
  campaign: string;
  revenue: number;
}

interface ProductRevenue {
  product: string;
  revenue: number;
}

interface CrossTableRow {
  campaign: string;
  products: { name: string; revenue: number }[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CHART_COLORS = [
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
      <p style={{ color: '#93c5fd' }}>{fmt(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
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
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingRevenuePage() {
  const { companyId } = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<CampaignRevenue[]>([]);
  const [productData, setProductData] = useState<ProductRevenue[]>([]);
  const [crossTable, setCrossTable] = useState<CrossTableRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topCampaign, setTopCampaign] = useState('—');
  const [topProduct, setTopProduct] = useState('—');

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/mysql/marketing/revenue?companyId=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch revenue stats');
      
      const data = await response.json();
      setCampaignData(data.campaignData || []);
      setProductData(data.productData || []);
      setCrossTable(data.crossTable || []);
      setTotalRevenue(data.totalRevenue || 0);
      setTopCampaign(data.topCampaign || '—');
      setTopProduct(data.topProduct || '—');
    } catch (err: any) {
      console.error('Revenue dashboard error:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allProducts = Array.from(new Set(crossTable.flatMap((r) => r.products.map((p) => p.name))));

  return (
    <div className="px-4 py-6 lg:px-8 xl:px-10 max-w-screen-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Revenue Dashboard</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Marketing attribution & product revenue breakdown
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Revenue" value={fmt(totalRevenue)} icon={DollarSign} color="#3b82f6" />
        <KPICard label="Top Campaign" value={topCampaign} icon={TrendingUp} color="#10b981" />
        <KPICard label="Top Product" value={topProduct} icon={BarChart2} color="#8b5cf6" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue by Campaign */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-base font-semibold text-white mb-1">Revenue by Campaign</h2>
          <p className="text-xs mb-5" style={{ color: 'rgba(148,163,184,0.6)' }}>NULL campaign shown as "Organic"</p>

          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaignData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
              No revenue data found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaignData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="campaign"
                  tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {campaignData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by Product */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-base font-semibold text-white mb-1">Revenue by Product</h2>
          <p className="text-xs mb-5" style={{ color: 'rgba(148,163,184,0.6)' }}>Based on paid invoices per product</p>

          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : productData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
              No revenue data found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="product"
                  tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {productData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Campaign vs Product Table */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#0f1f3d', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-base font-semibold text-white mb-1">Campaign × Product Revenue</h2>
        <p className="text-xs mb-5" style={{ color: 'rgba(148,163,184,0.6)' }}>Revenue breakdown by campaign and product</p>

        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : crossTable.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>
            No data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Campaign
                  </th>
                  {allProducts.map((p) => (
                    <th key={p} className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      {p}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {crossTable.map((row, ri) => {
                  const productRevByName: Record<string, number> = {};
                  row.products.forEach((p) => { productRevByName[p.name] = p.revenue; });
                  return (
                    <tr
                      key={ri}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      className="transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="py-3 px-4 font-medium text-white">{row.campaign}</td>
                      {allProducts.map((p) => (
                        <td key={p} className="py-3 px-4 text-right" style={{ color: 'rgba(148,163,184,0.85)' }}>
                          {productRevByName[p] ? fmt(productRevByName[p]) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-semibold" style={{ color: '#93c5fd' }}>
                        {fmt(row.total)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <td className="py-3 px-4 font-bold text-white text-xs uppercase tracking-wider">Total</td>
                  {allProducts.map((p) => {
                    const colTotal = crossTable.reduce((sum, row) => {
                      const found = row.products.find((pr) => pr.name === p);
                      return sum + (found?.revenue ?? 0);
                    }, 0);
                    return (
                      <td key={p} className="py-3 px-4 text-right font-bold" style={{ color: '#e2e8f0' }}>
                        {colTotal > 0 ? fmt(colTotal) : '—'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right font-bold text-lg" style={{ color: '#3b82f6' }}>
                    {fmt(totalRevenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
