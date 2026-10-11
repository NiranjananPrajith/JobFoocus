'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme-context';
import { fbqTrack } from '@/lib/meta-capi-client';
import NavigationIcon, { type NavigationIconName } from './design/NavigationIcon';

const links: { href: string; label: string; icon: NavigationIconName }[] = [
  { href: '/dashboard', label: 'Applications', icon: 'board' },
  { href: '/followups', label: 'Follow-ups', icon: 'clock' },
  { href: '/master-resume', label: 'Master resume', icon: 'document' },
  { href: '/jobs', label: 'All Jobs', icon: 'briefcase' },
  { href: '/categories', label: 'Manage categories', icon: 'categories' },
  { href: '/extension-install', label: 'Install extension', icon: 'download' },
  { href: '/trash', label: 'Trash', icon: 'trash' },
];

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const navigationToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const client = createClient();
    let alive = true;
    client.auth.getUser().then(({ data }) => { if (alive) setEmail(data.user?.email ?? ''); });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (alive) setEmail(session?.user.email ?? '');
      // Preserve signup analytics deduplication from the previous navigation.
      if (event === 'SIGNED_IN') {
        const match = document.cookie.match(/(?:^|;\s*)jf_reg_event_id=([^;]*)/);
        if (match?.[1]) {
          fbqTrack(match[1], 'CompleteRegistration');
          document.cookie = 'jf_reg_event_id=; max-age=0; path=/; SameSite=Lax';
        }
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      const { error: signOutError } = await createClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.push('/login');
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <aside className="workspace-sidebar no-print" aria-label="Workspace navigation" onKeyDown={(event) => { if (event.key === 'Escape' && open) { setOpen(false); navigationToggle.current?.focus(); } }}>
      <div className="sidebar-brand-row">
        <Link href="/dashboard" aria-label="JobFoocus applications"><Image src="/icon_wide.webp" alt="JobFoocus" width={1920} height={546} sizes="150px" priority /></Link>
        <button ref={navigationToggle} className="sidebar-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)}><NavigationIcon name={open ? 'close' : 'menu'} /></button>
      </div>
      <div id="workspace-navigation" className="sidebar-sections" data-open={open}>
        <span className="sidebar-label">Your workspace</span>
        <nav className="sidebar-links" aria-label="Workspace pages">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`) || (href === '/dashboard' && ['/application', '/document'].some(route => pathname.startsWith(route)));
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined}><NavigationIcon name={icon} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-account">
          <div className="account-identity"><span className="account-avatar" aria-hidden="true">{email ? email[0].toUpperCase() : 'J'}</span><div><strong>Your account</strong><span title={email}>{email || 'Your workspace'}</span></div></div>
          <nav className="sidebar-links" aria-label="Account pages"><Link href="/account" aria-current={pathname.startsWith('/account') ? 'page' : undefined}><NavigationIcon name="card" /><span>Account &amp; billing</span></Link><Link href="/support" aria-current={pathname.startsWith('/support') ? 'page' : undefined}><NavigationIcon name="help" /><span>Help &amp; support</span></Link></nav>
          <button className="sidebar-action" type="button" onClick={toggleTheme}><NavigationIcon name={theme === 'dark' ? 'sun' : 'moon'} /><span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
          <button className="sidebar-action" type="button" onClick={signOut} disabled={signingOut}><NavigationIcon name="logout" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
          {error && <p className="sidebar-error" role="alert">{error}</p>}
        </div>
      </div>
    </aside>
  );
}
