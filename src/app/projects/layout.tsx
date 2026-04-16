import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Shaarvik Control Panel',
  description: 'Manage client projects, track progress, and collaborate with your team.',
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
