'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, CalendarClock, AlertTriangle, Activity, Package, DollarSign, BarChart3, Target, Percent, TrendingDown } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import { createClient } from '@/lib/supabase/client';
import { fetchDashboardMetrics, DashboardMetrics } from '@/lib/services';
import { useCompanyId } from '@/hooks/useCompanyId';

export default function KPIBentoGrid() {
  const { companyId, loading: profileLoading } = useCompanyId();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0, activeLeads: 0, followupsToday: 0, overdueTasks: 0,
    activitiesThisWeek: 0, activeSubscriptions: 0,
    totalRevenue: 0, pendingAmount: 0, overdueAmount: 0,
    leadsCount: 0, conversionsCount: 0, campaignCost: 0,
    cpl: 0, roi: 0, conversionRate: 0,
    totalClients: 0, expiringSoon: 0, expiredSubscriptions: 0, clientRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async (cid: string) => {
    try {
      const data = await fetchDashboardMetrics(cid);
      setMetrics(data);
    } catch (err) {
      console.error('[KPIBentoGrid] fetchDashboardMetrics error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (!companyId) { setLoading(false); return; }
    fetchMetrics(companyId);
  }, [companyId, profileLoading, fetchMetrics]);

  // Real-time subscriptions — auto-refresh on leads, campaigns changes
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const refresh = () => fetchMetrics(companyId);

    const leadsChannel = supabase
      .channel('kpi_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, refresh)
      .subscribe();

    const campaignsChannel = supabase
      .channel('kpi_campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, refresh)
      .subscribe();

    const invoicesChannel = supabase
      .channel('kpi_invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [companyId, fetchMetrics]);

  function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function fmtRoi(n: number) {
    return n.toFixed(2) + 'x';
  }

  return (
    <div className="space-y-4">
      {/* Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <MetricCard label="Total Leads" value={loading ? '—' : metrics.totalLeads} subtext="All leads in CRM" trend="up" trendValue="Company filtered" icon={<Target size={18} />} variant="default" className="h-full" />
        <MetricCard label="Active Leads" value={loading ? '—' : metrics.activeLeads} subtext="Open opportunities" trend="up" trendValue="Excluding won & lost" icon={<TrendingUp size={18} />} variant="default" />
        <MetricCard label="Follow-ups Due" value={loading ? '—' : metrics.followupsToday} subtext="Leads with past follow-up dates" trend="neutral" trendValue="Needs attention" icon={<CalendarClock size={18} />} variant="warning" />
        <MetricCard label="Overdue Tasks" value={loading ? '—' : metrics.overdueTasks} subtext="Past due date, not completed" trend="down" trendValue="Needs immediate action" icon={<AlertTriangle size={18} />} variant="alert" />
        <MetricCard label="Activities This Week" value={loading ? '—' : metrics.activitiesThisWeek} subtext="Calls, meetings, messages" trend="up" trendValue="Last 7 days" icon={<Activity size={18} />} variant="success" />
        <MetricCard label="Active Subscriptions" value={loading ? '—' : metrics.activeSubscriptions} subtext="Currently active plans" trend="up" trendValue="Company subscriptions" icon={<Package size={18} />} variant="default" />
      </div>

      {/* Revenue & Marketing KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        <MetricCard label="Invoice Revenue" value={loading ? '—' : fmt(metrics.totalRevenue)} subtext="From paid invoices" trend="up" trendValue="All time" icon={<DollarSign size={18} />} variant="success" />
        <MetricCard label="Pending Amount" value={loading ? '—' : fmt(metrics.pendingAmount)} subtext="Awaiting payment" trend={metrics.pendingAmount > 0 ? 'neutral' : 'up'} trendValue={metrics.pendingAmount > 0 ? 'Needs collection' : 'All clear'} icon={<BarChart3 size={18} />} variant={metrics.pendingAmount > 0 ? 'warning' : 'default'} />
        <MetricCard label="Conversions" value={loading ? '—' : metrics.conversionsCount} subtext="Leads converted" trend="up" trendValue="Converted leads" icon={<TrendingUp size={18} />} variant="success" />
        <MetricCard label="Campaign Cost" value={loading ? '—' : fmt(metrics.campaignCost)} subtext="Total spent on campaigns" trend="neutral" trendValue="Sum of spent_amount" icon={<DollarSign size={18} />} variant="default" />
        <MetricCard label="CPL" value={loading ? '—' : (metrics.cpl > 0 ? fmt(metrics.cpl) : '—')} subtext="Cost per lead" trend={metrics.cpl > 0 ? 'neutral' : 'up'} trendValue="Cost ÷ Leads" icon={<TrendingDown size={18} />} variant="default" />
        <MetricCard label="ROI" value={loading ? '—' : (metrics.roi > 0 ? fmtRoi(metrics.roi) : '—')} subtext="Return on investment" trend={metrics.roi >= 1 ? 'up' : 'down'} trendValue="Revenue ÷ Cost" icon={<TrendingUp size={18} />} variant={metrics.roi >= 1 ? 'success' : 'warning'} />
        <MetricCard label="Conversion Rate" value={loading ? '—' : (metrics.conversionRate > 0 ? metrics.conversionRate.toFixed(1) + '%' : '—')} subtext="Leads converted %" trend={metrics.conversionRate > 20 ? 'up' : 'neutral'} trendValue="(Conversions / Leads) × 100" icon={<Percent size={18} />} variant={metrics.conversionRate > 20 ? 'success' : 'default'} />
      </div>
    </div>
  );
}