import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Shaarvik Control Panel',
  description: 'Sign in to your Shaarvik Control Panel workspace to manage your CRM, billing, and support.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
