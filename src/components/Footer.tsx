import React from 'react';
import SunsetStripeBand from '@/components/design/sunset-stripe-band';

const footerLinks = {
  'Why JobFoocus': ['Features', 'Pricing', 'Testimonials'],
  'Explore': ['All Jobs', 'Applied', 'Prospects', 'Follow-ups'],
  'Build': ['Documentation', 'API', 'Integrations'],
  'Legal': ['Privacy', 'Terms', 'Security'],
};

export default function Footer() {
  return (
    <>
      <SunsetStripeBand />
      <footer
        className="w-full py-16 px-6 no-print"
        style={{
          backgroundColor: '#fff8e0',
          borderTop: '1px solid #e6d5a8',
        }}
      >
        <div className="max-w-[1280px] mx-auto">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <a href="./index.html" className="flex items-center gap-2 mb-4">
                <img
                  src="./icon_wide.webp"
                  alt="Job Foocus"
                  className="h-8 object-contain"
                />
              </a>
              <p className="text-[14px] text-steel leading-[1.50]">
                Track your job applications with ease.
              </p>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4
                  className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink mb-4"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {title}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[14px] text-primary hover:underline"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div
            className="pt-6 flex items-center justify-between border-t"
            style={{ borderColor: '#e6d5a8' }}
          >
            <span
              className="text-[12px] text-steel"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              © 2024 Job Foocus. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <span
                className="text-[12px] text-steel"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}