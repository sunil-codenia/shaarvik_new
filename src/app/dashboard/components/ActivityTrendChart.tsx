'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';

interface TrendEntry {
  date: string;
  leads: number;
  conversions: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-dropdown px-3 py-2 text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-600 text-foreground" style={{ color: p.color }}>
          <span className="font-tabular">{p.value}</span> {p.name}
        </p>
      ))}
    </div>
  );
}

export default function ActivityTrendChart() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [trendData, setTrendData] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrend = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [leadsRes, conversionsRes] = await Promise.all([
        supabase.from('leads').select('created_at').eq('company_id', cid).gte('created_at', since),
        supabase.from('leads').select('updated_at').eq('company_id', cid).eq('status', 'won').gte('updated_at', since),
      ]);

      // Build last 14 days map
      const days: Record<string, TrendEntry> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        days[key] = { date: label, leads: 0, conversions: 0 };
      }

      (leadsRes.data || []).forEach((row: any) => {
        const key = row.created_at?.slice(0, 10);
        if (key && days[key]) days[key].leads++;
      });

      (conversionsRes.data || []).forEach((row: any) => {
        const key = row.updated_at?.slice(0, 10);
        if (key && days[key]) days[key].conversions++;
      });

      setTrendData(Object.values(days));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchTrend(companyId);
  }, [companyId, profileLoading, fetchTrend]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();

    const channel = supabase
      .channel('trend_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchTrend(companyId))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchTrend]);

  const total = trendData.reduce((s, d) => s + d.leads, 0);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-600 text-foreground">Leads & Conversions Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Leads created & converted — last 14 days</p>
        </div>
        <span className="text-xs font-500 text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
          {loading ? '—' : `${total} leads`}
        </span>
      </div>

      {loading && (
        <div className="mt-4 h-[220px] flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading trend data…</div>
        </div>
      )}

      {!loading && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#2563EB" strokeWidth={2} fill="url(#leadsGradient)" dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#22c55e" strokeWidth={2} fill="url(#conversionsGradient)" dot={false} activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}