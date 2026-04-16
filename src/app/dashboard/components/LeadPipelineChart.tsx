'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#0ea5e9',
  qualified: '#8b5cf6',
  proposal: '#f59e0b',
  won: '#22c55e',
  lost: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
};

interface PipelineEntry {
  status: string;
  count: number;
  fill: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { status: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl shadow-dropdown px-3 py-2 text-sm">
      <p className="font-600 text-foreground">{d.payload.status}</p>
      <p className="text-muted-foreground">
        <span className="font-tabular font-600 text-foreground">{d.value}</span> leads
      </p>
    </div>
  );
}

export default function LeadPipelineChart() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('leads')
        .select('status')
        .eq('company_id', cid);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          const s = row.status || 'new';
          counts[s] = (counts[s] || 0) + 1;
        });

        const ordered = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
        const entries: PipelineEntry[] = ordered
          .filter(s => counts[s] !== undefined)
          .map(s => ({
            status: STATUS_LABELS[s] || s,
            count: counts[s],
            fill: STATUS_COLORS[s] || '#94a3b8',
          }));

        Object.keys(counts).forEach(s => {
          if (!ordered.includes(s)) {
            entries.push({ status: STATUS_LABELS[s] || s, count: counts[s], fill: '#94a3b8' });
          }
        });

        setPipelineData(entries);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchPipeline(companyId);
  }, [companyId, profileLoading, fetchPipeline]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();

    const channel = supabase
      .channel('pipeline_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchPipeline(companyId))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchPipeline]);

  const total = pipelineData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[15px] font-600 text-foreground">Lead Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Current leads by stage</p>
        </div>
        <span className="text-xs font-500 text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
          {loading ? '—' : `${total} total`}
        </span>
      </div>

      {loading && (
        <div className="mt-4 h-[220px] flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading pipeline data…</div>
        </div>
      )}

      {!loading && pipelineData.length === 0 && (
        <div className="mt-4 h-[220px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No leads data available.</p>
        </div>
      )}

      {!loading && pipelineData.length > 0 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={pipelineData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              barCategoryGap="32%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 16%, 47%)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(210, 40%, 96%)' }} />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                onMouseEnter={(data) => setActiveBar(data.status)}
                onMouseLeave={() => setActiveBar(null)}
              >
                {pipelineData.map((entry) => (
                  <Cell
                    key={`bar-${entry.status}`}
                    fill={entry.fill}
                    opacity={activeBar === null || activeBar === entry.status ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && pipelineData.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {pipelineData.map((d) => (
            <div key={`legend-${d.status}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.fill }} />
              {d.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}