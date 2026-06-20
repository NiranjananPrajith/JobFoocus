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

const FBQ_STUB = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
`;

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
        id="meta-pixel-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: FBQ_STUB }}
      />
      <Script
        id="meta-pixel-pageview"
        strategy="afterInteractive"
        onReady={() => {
          window.fbq('init', '2172124703579742');
          window.fbq('track', 'PageView');
          initialized.current = true;
        }}
      />
    </>
  );
}
