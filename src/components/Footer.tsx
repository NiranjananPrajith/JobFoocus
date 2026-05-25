'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer
      className="w-full py-8 px-6 no-print"
      style={{
        backgroundColor: '#fff8e0',
        borderTop: '1px solid #e6d5a8',
      }}
    >
      <div className="max-w-[1280px] mx-auto">
        {/* Brand Section */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/icon_wide.webp"
            alt="Job Foocus"
            className="h-8 object-contain mb-3"
          />
          <p
            className="text-[14px] text-steel text-center"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Track your job applications with ease.
          </p>
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
  );
}