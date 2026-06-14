'use client'

import { useInView } from '@/lib/use-in-view'

const LOGOS = [
  { file: 'google-logo.svg', alt: 'Google' },
  { file: 'meta-logo.svg', alt: 'Meta' },
  { file: 'microsoft-logo.svg', alt: 'Microsoft' },
  { file: 'stripe-logo.svg', alt: 'Stripe' },
  { file: 'spotify-logo.svg', alt: 'Spotify' },
  { file: 'airbnb-logo.svg', alt: 'Airbnb' },
  { file: 'notion-logo.svg', alt: 'Notion' },
]

export default function TrustRibbon() {
  const [ref, inView] = useInView()

  return (
    <section
      className="w-full px-6 py-12 md:py-16"
      style={{ backgroundColor: 'var(--cream)' }}
    >
      <div className="max-w-[1280px] mx-auto text-center">
        <p
          className="text-[13px] font-medium mb-8 transition-opacity duration-700"
          style={{ color: 'var(--steel)' }}
        >
          Job seekers using our engine have interview invitations from teams at&hellip;
        </p>
        <div
          ref={ref}
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {LOGOS.map((logo) => (
            <div
              key={logo.file}
              className="h-8 md:h-10 flex items-center"
              style={{ opacity: 0.35, filter: 'grayscale(1)' }}
            >
              <img
                src={`/company-logos/${logo.file}`}
                alt={logo.alt}
                className="h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
