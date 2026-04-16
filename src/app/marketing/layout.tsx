'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Film, DollarSign, Bot, BarChart2, FileText, Megaphone, Webhook } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const tabs = [
  { label: 'Dashboard', href: '/marketing', icon: LayoutDashboard },
  { label: 'Campaign Builder', href: '/marketing/campaign-builder', icon: Megaphone },
  { label: 'Creatives', href: '/marketing/creatives', icon: Film },
  { label: 'Revenue', href: '/marketing/revenue', icon: DollarSign },
  { label: 'Shaarvik AI', href: '/marketing/ai', icon: Bot },
  { label: 'Analysis Report', href: '/marketing/analysis', icon: BarChart2 },
  { label: 'Ad Webhooks', href: '/marketing/webhooks', icon: Webhook },
  { label: 'Debug Report', href: '/marketing/report', icon: FileText },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3d 50%, #1a2744 100%)' }}>
        {/* Page Header */}
        <div
          className="px-6 pt-6 pb-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="max-w-screen-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-1">Marketing</h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Manage campaigns, creatives, and revenue insights
            </p>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive =
                  tab.href === '/marketing'
                    ? pathname === '/marketing'
                    : pathname.startsWith(tab.href);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 relative"
                    style={
                      isActive
                        ? {
                            color: '#93c5fd',
                            background: 'rgba(59,130,246,0.12)',
                            borderBottom: '2px solid #3b82f6',
                          }
                        : {
                            color: 'rgba(148,163,184,0.7)',
                            borderBottom: '2px solid transparent',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.7)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={15} className="flex-shrink-0" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-screen-2xl mx-auto">
          {children}
        </div>
      </div>
    </>
  );
}
