import React from 'react';
import type { Metadata } from 'next';
import WebsiteHeader from './components/WebsiteHeader';
import WebsiteFooter from './components/WebsiteFooter';

export const metadata: Metadata = {
  title: 'Shaarvik Technologies LLP — Smart SaaS for Modern Businesses',
  description:
    'Shaarvik Technologies develops powerful SaaS products to simplify business operations. Explore Buildarya — project, cost, and labour management platform.',
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <WebsiteHeader />
      <main className="flex-1">{children}</main>
      <WebsiteFooter />
    </div>
  );
}
