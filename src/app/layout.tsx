import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppLayoutBoundary from '@/components/layout/AppLayoutBoundary';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: 'Shaarvik Control Panel',
  description:
    'Shaarvik Technologies LLP — Control Panel for CRM, Billing, Support & Operations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Shaarvik CP',
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/assets/images/app_logo.png', sizes: '192x192' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <RBACProvider>
              <ToastProvider>
                <AppLayoutBoundary>{children}</AppLayoutBoundary>
              </ToastProvider>
            </RBACProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}