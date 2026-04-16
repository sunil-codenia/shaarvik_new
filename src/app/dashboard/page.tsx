import React from 'react';
import type { Metadata } from 'next';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import ChartsRow from './components/ChartsRow';
import FollowUpsPanel from './components/FollowUpsPanel';
import RecentActivitiesFeed from './components/RecentActivitiesFeed';
import OverdueTasksPanel from './components/OverdueTasksPanel';
import { Toaster } from 'sonner';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard | Shaarvik Control Panel',
  description: 'Overview of your CRM metrics — leads, clients, tasks, campaigns, invoices, and support tickets.',
};

function WidgetSkeleton({ height = 'h-40' }: { height?: string }) {
  return <div className={`skeleton rounded-xl w-full ${height}`} />;
}

export default function DashboardPage() {
  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      <div className="px-4 py-6 lg:px-8 xl:px-10 2xl:px-12 max-w-screen-2xl mx-auto space-y-6 page-enter">
        <DashboardHeader />

        {/* KPI Widgets — async loaded */}
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {Array.from({ length: 11 }).map((_, i) => <WidgetSkeleton key={i} height="h-28" />)}
          </div>
        }>
          <KPIBentoGrid />
        </Suspense>

        {/* Charts — async loaded */}
        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetSkeleton height="h-64" />
            <WidgetSkeleton height="h-64" />
          </div>
        }>
          <ChartsRow />
        </Suspense>

        {/* Bottom panels — async loaded */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Suspense fallback={<WidgetSkeleton height="h-56" />}>
              <FollowUpsPanel />
            </Suspense>
          </div>
          <div className="lg:col-span-1">
            <Suspense fallback={<WidgetSkeleton height="h-56" />}>
              <RecentActivitiesFeed />
            </Suspense>
          </div>
          <div className="lg:col-span-1">
            <Suspense fallback={<WidgetSkeleton height="h-56" />}>
              <OverdueTasksPanel />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}