'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, ArrowRight, Phone, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import Link from 'next/link';

interface FollowUp {
  id: string;
  title: string;
  clientName: string | null;
  clientId: string | null;
  status: string;
  followUpDate: string;
  assigneeName: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-50 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-50 text-yellow-700' },
  qualified: { label: 'Qualified', color: 'bg-purple-50 text-purple-700' },
  proposal: { label: 'Proposal', color: 'bg-orange-50 text-orange-700' },
  won: { label: 'Won', color: 'bg-green-50 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-50 text-red-700' },
};

export default function FollowUpsPanel() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);

  const fetchFollowUps = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('leads')
        .select('id, title, status, follow_up_date')
        .eq('company_id', cid)
        .not('status', 'in', '("won","lost")')
        .lte('follow_up_date', nextWeek)
        .not('follow_up_date', 'is', null)
        .order('follow_up_date', { ascending: true })
        .limit(6);

      const items = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        clientName: null,
        clientId: null,
        status: row.status,
        followUpDate: row.follow_up_date,
        assigneeName: null,
      }));

      setFollowUps(items);
      setTodayCount(items.filter(f => f.followUpDate <= today).length);
      setWeekCount(items.length);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchFollowUps(companyId);
  }, [companyId, profileLoading, fetchFollowUps]);

  // Real-time subscription — auto-refresh on leads changes
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel('followups_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchFollowUps(companyId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, fetchFollowUps]);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-border shadow-card flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-amber-500" />
          <h3 className="text-[15px] font-600 text-foreground">Upcoming Follow-ups</h3>
        </div>
        <Link href="/leads" className="flex items-center gap-1 text-xs font-500 text-primary hover:text-primary/80 transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {loading && (
        <ul className="flex-1 divide-y divide-border">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2"><div className="h-3.5 bg-muted rounded w-2/3" /><div className="h-3 bg-muted rounded w-1/2" /></div>
            </li>
          ))}
        </ul>
      )}

      {!loading && followUps.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">No upcoming follow-ups.</p>
        </div>
      )}

      {!loading && followUps.length > 0 && (
        <ul className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
          {followUps.map((item) => {
            const sc = statusConfig[item.status] || { label: item.status, color: 'bg-gray-50 text-gray-600' };
            const isToday = item.followUpDate <= today;
            return (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-600 text-primary">
                    {(item.clientName || item.title).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-500 text-foreground truncate">{item.clientName || item.title}</p>
                    {isToday && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-600 bg-amber-50 text-amber-700">Today</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-500 ${sc.color}`}>{sc.label}</span>
                    {item.assigneeName && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <User size={10} />{item.assigneeName}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground ml-auto font-tabular">{formatDate(item.followUpDate)}</span>
                  </div>
                </div>
                <Link href={`/leads/${item.id}`} className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 mt-0.5">
                  <Phone size={14} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-border bg-muted/30 rounded-b-xl">
        <p className="text-xs text-muted-foreground">
          <span className="font-600 text-amber-600">{todayCount} follow-up{todayCount !== 1 ? 's' : ''}</span> due today ·{' '}
          <span className="font-600 text-foreground">{weekCount} this week</span>
        </p>
      </div>
    </div>
  );
}