'use client';

import { usePathname } from 'next/navigation';
import WorkspaceSidebar from './WorkspaceSidebar';
import MarketingHeader from '@/app/(marketing)/components/MarketingHeader';
import MarketingFooter from '@/app/(marketing)/components/MarketingFooter';

const publicRoutes = ['/pricing', '/features', '/privacy-policy', '/terms-of-service', '/extension-install', '/login', '/signup', '/support'];
const pageLabels: Record<string, string> = { dashboard: 'Applications', application: 'Application', jobs: 'All Jobs', followups: 'Follow-ups', 'master-resume': 'Master resume', categories: 'Categories', trash: 'Trash', account: 'Account & billing', support: 'Help & support', insider: 'Insider access', document: 'Document editor' };

/** Separate public and working layouts, while preserving server-rendered children. */
export default function SiteShell({ children, document = false }: { children: React.ReactNode; document?: boolean }) {
  const pathname = usePathname();
  const route = pathname.split('/')[1];
  if (publicRoutes.includes(`/${route}`)) {
    return <div className="jf-site public-site"><a className="skip" href="#main">Skip to content</a><div className="page"><MarketingHeader /><main id="main" className="public-content">{children}</main><MarketingFooter /></div></div>;
  }
  return (
    <div className={`workspace-shell ${document ? 'workspace-document' : ''}`}>
      <a className="workspace-skip" href="#main">Skip to content</a>
      <WorkspaceSidebar />
      <div className="workspace-body">
        <header className="workspace-topbar no-print"><span>Workspace <span aria-hidden="true">/</span> <strong>{pageLabels[route] || 'Your workspace'}</strong></span></header>
        <div id="modal-root" />
        <main id="main" className="app-content">{children}</main>
        <footer className="workspace-footer no-print"><span>© {new Date().getUTCFullYear()} JobFoocus</span><a href="/privacy-policy">Privacy</a><a href="/terms-of-service">Terms</a></footer>
      </div>
    </div>
  );
}
