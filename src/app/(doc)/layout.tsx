import SiteShell from '@/components/SiteShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell document>{children}</SiteShell>;
}
