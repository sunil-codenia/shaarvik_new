'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default function AppLayoutBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public/Auth routes that should NEVER have the sidebar
  const noLayoutRoutes = ['/', '/login', '/signup', '/forgot-password', '/auth/callback', '/website'];

  const isNoLayoutRoute = noLayoutRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isNoLayoutRoute) {
    return <>{children}</>;
  }

  // Wraps all dashboard/internal routes with the persistent sidebar
  return <AppLayout>{children}</AppLayout>;
}
