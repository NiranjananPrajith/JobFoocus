'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import NavigationIcon from '@/components/design/NavigationIcon';

/** The marketing navigation stays independent of the application shell. */
export default function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header container" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <Link className="brand" href="/" aria-label="JobFoocus home">
        <Image src="/icon_wide.webp" alt="JobFoocus" width={1920} height={546} priority />
      </Link>
      <nav className="nav" id="marketing-navigation" aria-label="Main navigation" data-open={open}>
        <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <a href="/#features" onClick={() => setOpen(false)}>Features</a>
        <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
        <a href="/#questions" onClick={() => setOpen(false)}>Questions</a>
      </nav>
      <button className="menu" type="button" aria-controls="marketing-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
      <div className="header-actions">
        <button className="theme-control" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <NavigationIcon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <Link className="button" href="/signup">Start for free</Link>
      </div>
    </header>
  );
}
