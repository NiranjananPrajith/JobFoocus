'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/all-jobs', label: 'All Jobs' },
  { href: '/applied', label: 'Applied' },
  { href: '/prospects', label: 'Prospects' },
  { href: '/followups', label: 'Follow-ups' },
];

const NavBar = () => {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#e8ebe6]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-[24px]">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center">
            <span className="text-[14px] font-semibold leading-[20px] text-[#0e0f0c]">
              Job Foocus
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'relative px-4 py-2 text-[14px] font-semibold leading-[20px] transition-colors duration-200',
                    isActive ? 'text-[#0e0f0c]' : 'text-[#454745] hover:text-[#0e0f0c]',
                  ].join(' ')}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#9fe870] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button placeholder */}
          <button className="md:hidden p-2 text-[#0e0f0c]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;