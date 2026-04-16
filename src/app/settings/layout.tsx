import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Shaarvik Control Panel',
  description: 'Configure your workspace settings, company profile, and system preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
