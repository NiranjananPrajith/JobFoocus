'use client';

import Image from 'next/image';
import { useRef } from 'react';

/** Imperative pointer motion avoids React renders on every mouse movement. */
export default function HeroArtwork() {
  const artwork = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={artwork}
      className="hero-art"
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        artwork.current?.style.setProperty('--drift', `${((event.clientY - rect.top) / rect.height - 0.5) * 12}px`);
      }}
      onPointerLeave={() => artwork.current?.style.setProperty('--drift', '0px')}
    >
      <Image src="/images/redesign/hero.webp" alt="Soft orange folder with a resume, cover letter, and checkmark" width={1536} height={1024} sizes="(max-width: 700px) 90vw, (max-width: 1240px) 45vw, 550px" priority />
      <span className="art-label"><span className="dot" aria-hidden="true" />Resume + cover letter</span>
      <span className="art-label"><span className="dot" aria-hidden="true" />One organized workspace</span>
    </div>
  );
}
