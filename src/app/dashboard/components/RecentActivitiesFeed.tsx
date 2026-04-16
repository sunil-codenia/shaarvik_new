'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ArrowRight, Phone, Users, MessageSquare, Mail, StickyNote, UserPlus, CheckCircle, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import Link from 'next/link';

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  call: { icon: Phone, label: 'Call', color: 'bg-blue-50 text-blue-600' },
  meeting: { icon: Users, label: 'Meeting', color: 'bg-violet-50 text-violet-600' },
  message: { icon: MessageSquare, label: 'Message', color: 'bg-sky-50 text-sky-600' },
  email: { icon: Mail, label: 'Email', color: 'bg-amber-50 text-amber-600' },
  note: { icon: StickyNote, label: 'Note', color: 'bg-gray-50 text-gray-600' },
  new_lead: { icon: UserPlus, label: 'New Lead', color: 'bg-blue-50 text-blue-600' },
  lead_converted: { icon: CheckCircle, label: 'Converted', color: 'bg-green-50 text-green-600' },
  new_client: { icon: Building2, label: 'New Client', color: 'bg-purple-50 text-purple-600' },
};

interface FeedItem {
  id: string;
  type: string;
  summary: string;
  entityName: string | null;
  loggedByName: string | null;
  timestamp: string;
  source: 'activity' | 'lead' | 'client';
}

export default function RecentActivitiesFeed() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async (cid: string) => {
    try {
      const supabase = createClient();

      const [activitiesRes, recentLeadsRes, convertedLeadsRes] = await Promise.all([
        supabase.from('activities')
          .select('id, type, summary, activity_date')
          .eq('company_id', cid)
          .order('activity_date', { ascending: false })
          .limit(5),
        supabase.from('leads')
          .select('id, name, title, created_at')
          .eq('company_id', cid)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('leads')
          .select('id, name, title, converted_at')
          .eq('company_id', cid)
          .eq('is_converted', true)
          .not('converted_at', 'is', null)
          .order('converted_at', { ascending: false })
          .limit(5),
      ]);

      const items: FeedItem[] = [];

      (activitiesRes.data || []).forEach((a: any) => {
        items.push({
          id: `act-${a.id}`,
          type: a.type,
          summary: a.summary,
          entityName: null,
          loggedByName: null,
          timestamp: a.activity_date,
          source: 'activity',
        });
      });

      (recentLeadsRes.data || []).forEach((l: any) => {
        items.push({
          id: `lead-new-${l.id}`,
          type: 'new_lead',
          summary: `New lead: ${l.name || l.title || 'Unnamed'}`,
          entityName: l.name || l.title || null,
          loggedByName: null,
          timestamp: l.created_at,
          source: 'lead',
        });
      });

      (convertedLeadsRes.data || []).forEach((l: any) => {
        items.push({
          id: `lead-conv-${l.id}`,
          type: 'lead_converted',
          summary: `Lead converted: ${l.name || l.title || 'Unnamed'}`,
          entityName: l.name || l.title || null,
          loggedByName: null,
          timestamp: l.converted_at,
          source: 'lead',
        });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedItems(items.slice(0, 10));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchFeed(companyId);
  }, [companyId, profileLoading, fetchFeed]);

  // Real-time subscriptions
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const refresh = () => fetchFeed(companyId);

    const leadsChannel = supabase.channel('feed_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, refresh)
      .subscribe();

    const clientsChannel = supabase.channel('feed_clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, refresh)
      .subscribe();

    const activitiesChannel = supabase.channel('feed_activities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [companyId, fetchFeed]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-card flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h3 className="text-[15px] font-600 text-foreground">Activity Feed</h3>
        </div>
        <Link href="/activities" className="flex items-center gap-1 text-xs font-500 text-primary hover:text-primary/80 transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {loading && (
        <ul className="flex-1 divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2"><div className="h-3.5 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
            </li>
          ))}
        </ul>
      )}

      {!loading && feedItems.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        </div>
      )}

      {!loading && feedItems.length > 0 && (
        <ul className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
          {feedItems.map((item) => {
            const config = typeConfig[item.type] || { icon: Activity, label: item.type, color: 'bg-gray-50 text-gray-600' };
            const IconComp = config.icon;
            return (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.color}`}>
                  <IconComp size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-500 text-foreground truncate">{item.entityName || 'System'}</p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 font-tabular">{timeAgo(item.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.summary}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-500 ${config.color}`}>{config.label}</span>
                    {item.loggedByName && <span className="text-[11px] text-muted-foreground">{item.loggedByName}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-border bg-muted/30 rounded-b-xl">
        <p className="text-xs text-muted-foreground">
          <span className="font-600 text-foreground">{feedItems.length} events</span> — auto-refreshing
        </p>
      </div>
    </div>
  );
}