import React from 'react';
import SunsetStripeBand from '@/components/design/sunset-stripe-band';

const productLinks = {
  'app': ['Features', 'Extension', 'Pricing'],
  'legal': ['Privacy Policy', 'Terms of Service'],
};

export default function Footer({ variant = 'app' }: { variant?: 'app' | 'marketing' }) {
  const isMarketing = variant === 'marketing'

  return (
    <>
      <SunsetStripeBand />
      <footer
        className="w-full py-14 px-6 no-print"
        style={{
          backgroundColor: 'var(--footer-cream)',
          borderTop: '1px solid var(--beige-deep)',
        }}
      >
        <div className="max-w-[1280px] mx-auto">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand Column */}
            <div className={isMarketing ? 'md:col-span-2' : 'md:col-span-1'}>
              <a href="/" className="flex items-center gap-2 mb-4">
                <img
                  src="/icon_wide.webp"
                  alt="Job Foocus"
                  className={`h-8 object-contain ${isMarketing ? 'grayscale opacity-80' : ''}`}
                />
              </a>
              <p className="text-[14px] text-steel leading-relaxed max-w-xs">
                {isMarketing
                  ? 'The elegant, private platform for professionals who want to own their job search.'
                  : 'Track your job applications with confidence.'}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4
                className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Product
              </h4>
              <ul className="space-y-2">
                {isMarketing ? (
                  <>
                    <li>
                      <a href="/signup" className="text-[14px] text-primary hover:underline" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Create Account
                      </a>
                    </li>
                    <li>
                      <a href="https://chromewebstore.google.com/detail/dddmilcbgjmfidicpahglaflfjfcnjl" target="_blank" rel="noopener noreferrer" className="text-[14px] text-primary hover:underline" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Add Companion Extension
                      </a>
                    </li>
                    <li>
                      <a href="/support" className="text-[14px] text-primary hover:underline" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Help Center
                      </a>
                    </li>
                  </>
                ) : (
                  productLinks['app'].map((link) => (
                    <li key={link}>
                      <a
                        href={link === 'Pricing' ? '/pricing' : link === 'Features' ? '/features' : link === 'Extension' ? '/extension-install' : '#'}
                        className="text-[14px] text-primary hover:underline"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {link}
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4
                className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Legal
              </h4>
              <ul className="space-y-2">
                {productLinks['legal'].map((link) => (
                  <li key={link}>
                    <a
                      href={link === 'Privacy Policy' ? '/privacy-policy' : '/terms-of-service'}
                      className="text-[14px] text-primary hover:underline"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social — app variant only */}
            {!isMarketing && (
              <div>
                <h4
                  className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Connect
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      X
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div
            className="pt-6 flex items-center justify-between border-t"
            style={{ borderColor: 'var(--beige-deep)' }}
          >
            <span
              className="text-[12px] text-steel"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              &copy; 2026 Job Foocus. All rights reserved.
            </span>
            {!isMarketing && (
              <div className="flex items-center gap-4">
                <span
                  className="text-[12px] text-steel"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  v1.0.0
                </span>
              </div>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}