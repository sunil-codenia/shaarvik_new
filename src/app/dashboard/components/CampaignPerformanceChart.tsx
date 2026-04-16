'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';

interface CampaignEntry {
  name: string;
  leads: number;
  won: number;
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
      <p className="font-600 text-foreground text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs" style={{ color: p.color }}>
          <span className="font-tabular font-600">{p.value}</span> {p.name}
        </p>
      ))}
    </div>
  );
}

export default function CampaignPerformanceChart() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [data, setData] = useState<CampaignEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();
      const { data: leads } = await supabase
        .from('leads')
        .select('campaign_id, status, campaigns(name)')
        .eq('company_id', cid)
        .not('campaign_id', 'is', null);

      if (leads) {
        const map: Record<string, { name: string; leads: number; won: number }> = {};
        leads.forEach((row: any) => {
          const cid2 = row.campaign_id;
          const cname = row.campaigns?.name || 'Unknown';
          if (!map[cid2]) map[cid2] = { name: cname, leads: 0, won: 0 };
          map[cid2].leads++;
          if (row.status === 'won') map[cid2].won++;
        });
        const entries = Object.values(map)
          .sort((a, b) => b.leads - a.leads)
          .slice(0, 8);
        setData(entries);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchData(companyId);
  }, [companyId, profileLoading, fetchData]);

  // Real-time
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('campaign_perf')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchData(companyId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchData]);

  const total = data.reduce((s, d) => s + d.leads, 0);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-600 text-foreground">Campaign Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Leads & conversions per campaign</p>
        </div>
        <span className="text-xs font-500 text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
          {loading ? '—' : `${total} leads`}
        </span>
      </div>

      {loading && (
        <div className="mt-4 h-[220px] flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading campaign data…</div>
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="mt-4 h-[220px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No campaign data yet.</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(210, 40%, 96%)' }} />
              <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
              </Bar>
              <Bar dataKey="won" name="Won" fill="#22c55e" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill="#22c55e" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0" /> Leads
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" /> Won
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
