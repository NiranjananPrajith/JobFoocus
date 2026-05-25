'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = [
  { href: './index.html', label: 'Dashboard' },
  { href: './all-jobs/index.html', label: 'All Jobs' },
  { href: './applied/index.html', label: 'Applied' },
  { href: './prospects/index.html', label: 'Prospects' },
  { href: './followups/index.html', label: 'Follow-ups' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full no-print"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #ededed',
          height: '64px',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          {/* Left - Brand */}
          <a href="./index.html" className="flex items-center">
            <img
              src="/icon_wide.webp"
              alt="Job Foocus"
              className="h-8 object-contain"
            />
          </a>

          {/* Right - Desktop Navigation + CTA */}
          <div className="flex items-center gap-4 md:gap-6">
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={[
                      'px-4 py-2 text-[14px] font-medium transition-colors duration-150',
                      isActive
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-steel hover:text-ink',
                    ].join(' ')}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>

            {/* CTA Button */}
            <button
              className="hidden md:inline-flex px-5 py-2.5 rounded-md text-[14px] font-medium text-white transition-colors duration-150"
              style={{
                backgroundColor: '#fa520f',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc3a05')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fa520f')}
            >
              Add Job
            </button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={[
          'fixed top-[64px] left-0 right-0 z-50 bg-canvas border-b border-hairline-soft',
          'transform transition-transform duration-200 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <nav className="flex flex-col p-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <a
                key={link.href + '-mobile'}
                href={link.href}
                className={[
                  'px-4 py-3 text-[16px] font-medium transition-colors duration-150',
                  'border-b border-hairline-soft last:border-b-0',
                  isActive
                    ? 'text-primary'
                    : 'text-ink hover:text-primary',
                ].join(' ')}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            );
          })}
          <button
            className="mt-4 w-full px-5 py-3 rounded-md text-[14px] font-medium text-white transition-colors duration-150"
            style={{
              backgroundColor: '#fa520f',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Add Job
          </button>
        </nav>
      </div>
    </>
  );
}