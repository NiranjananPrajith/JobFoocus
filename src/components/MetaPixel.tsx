'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: Window['fbq'];
  }
}

function waitForFbq(cb: () => void) {
  if (typeof window.fbq === 'function') { cb(); return; }
  let tries = 0;
  const id = setInterval(() => {
    tries++;
    if (typeof window.fbq === 'function') { clearInterval(id); cb(); }
    if (tries > 50) clearInterval(id); // 5s max
  }, 100);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current || typeof window.fbq !== 'function') return;
    window.fbq('track', 'PageView');
  }, [pathname]);

  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
        onReady={() => {
          waitForFbq(() => {
            window.fbq('init', '2172124703579742');
            window.fbq('track', 'PageView');
            initialized.current = true;
          });
        }}
      />
    </>
  );
}
