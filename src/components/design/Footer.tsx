'use client';

import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0e0f0c] text-[#e8ebe6]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-[24px] py-12 md:py-[48px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-[14px] leading-[20px]">
            <p>JobHunt - Job Application Tracker</p>
            <p className="text-[#868685] mt-1">Tracking your job search journey</p>
          </div>
          <div className="text-[14px] leading-[20px] text-[#868685]">
            <p>{currentYear} All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;