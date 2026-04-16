'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardHeader() {
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'there';

  const getGreeting = () => {
    const hour = new Date()?.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const now = new Date();
    setLastUpdated(
      now?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      const now = new Date();
      setLastUpdated(
        now?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      router?.refresh();
      toast?.success('Dashboard refreshed', { description: 'All data is up to date.' });
    }, 1200);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Shaarvik Control Panel
            {lastUpdated && (
              <span className="ml-2 text-slate-300">· Updated {lastUpdated}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-150 active:scale-95 disabled:opacity-60"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={() => router?.push('/add-client')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all duration-150 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(37,99,235,0.45)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.35)'; }}
        >
          <Plus size={14} />
          <span>Add Client</span>
        </button>
      </div>
    </div>
  );
}