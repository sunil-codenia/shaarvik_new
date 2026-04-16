'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Activity, Phone, Users, MessageSquare, Mail, StickyNote, ChevronRight } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import debug from '@/lib/debug';
import { useCompanyId } from '@/hooks/useCompanyId';
import { fetchActivities as fetchActivitiesService } from '@/lib/services';
import Icon from '@/components/ui/AppIcon';


interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  notes: string | null;
  clientName: string | null;
  clientId: string | null;
  loggedByName: string | null;
  activityDate: string;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call: { label: 'Call', icon: Phone, color: 'bg-blue-50 text-blue-600' },
  meeting: { label: 'Meeting', icon: Users, color: 'bg-violet-50 text-violet-600' },
  message: { label: 'Message', icon: MessageSquare, color: 'bg-sky-50 text-sky-600' },
  email: { label: 'Email', icon: Mail, color: 'bg-amber-50 text-amber-600' },
  note: { label: 'Note', icon: StickyNote, color: 'bg-gray-50 text-gray-600' },
};

export default function ActivitiesPage() {
  const router = useRouter();
  const { error: toastError } = useToast();
  const { companyId, loading: profileLoading, userId } = useCompanyId();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadActivities = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      debug.authCheck('activities', userId);
      const data = await fetchActivitiesService(companyId);
      setActivities(data.map((row: any) => ({
        id: row.id,
        type: row.type,
        summary: row.summary,
        notes: row.notes,
        clientName: row.clients?.name || null,
        clientId: row.clients?.id || null,
        loggedByName: row.user_profiles?.full_name || null,
        activityDate: row.activity_date,
      })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load activities.');
      toastError(err?.message || 'Failed to load activities.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, toastError]);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    loadActivities();
  }, [companyId, profileLoading, loadActivities]);

  const filtered = activities.filter(a => {
    const matchesSearch = !search.trim() || a.summary?.toLowerCase().includes(search.toLowerCase()) || a.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <>
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-600 text-foreground">Activities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Loading...' : `${filtered.length} activit${filtered.length !== 1 ? 'ies' : 'y'}`}
            </p>
          </div>
          <Link href="/activities/add" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 active:scale-95 shadow-sm">
            <Plus size={15} /><span>Log Activity</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activities..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
            <option value="all">All Types</option>
            {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

        {loading && (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-muted rounded w-2/3" /><div className="h-3 bg-muted rounded w-1/3" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Activity size={22} className="text-primary" /></div>
            <h3 className="text-base font-600 text-foreground mb-1">{search || typeFilter !== 'all' ? 'No activities found' : 'No activities yet'}</h3>
            <p className="text-sm text-muted-foreground mb-5">{search || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Log your first activity to get started.'}</p>
            {!search && typeFilter === 'all' && (
              <Link href="/activities/add" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 text-white bg-primary hover:bg-primary/90 transition-all duration-150 shadow-sm">
                <Plus size={14} /> Log Activity
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {filtered.map(act => {
                const tc = typeConfig[act.type] || { label: act.type, icon: Activity, color: 'bg-gray-50 text-gray-600' };
                const Icon = tc.icon;
                return (
                  <li key={act.id}>
                    <button onClick={() => router.push(`/activities/${act.id}`)} className="w-full text-left group">
                      <div className="flex items-start gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${tc.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-500 text-foreground truncate">{act.summary}</p>
                            <span className="text-[11px] text-muted-foreground flex-shrink-0">
                              {new Date(act.activityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 ${tc.color}`}>{tc.label}</span>
                            {act.clientName && <span className="text-xs text-muted-foreground truncate">{act.clientName}</span>}
                            {act.loggedByName && <span className="text-xs text-muted-foreground/60">by {act.loggedByName}</span>}
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
