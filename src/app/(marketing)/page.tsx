import MarketingLandingPage from './MarketingLandingPage'

export const metadata = {
  title: 'Job Foocus — Your Career Frontier. In your hands.',
  description:
    'A local-first browser extension that clips job descriptions, writes ATS-optimized cover letters, and tracks your pipeline — without sending your data to the cloud.',
  openGraph: {
    title: 'Job Foocus — Your Career Frontier',
    description:
      'Local-first job search extension with AI-powered document generation and pipeline tracking.',
    url: 'https://jobfoocus.com',
    siteName: 'Job Foocus',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://jobfoocus.com/homepageSS.webp',
        width: 1200,
        height: 630,
        alt: 'Job Foocus — Career Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Foocus — Your Career Frontier',
    description:
      'Local-first job search extension with AI-powered document generation and pipeline tracking.',
    images: ['https://jobfoocus.com/homepageSS.webp'],
  },
}

export default function Page() {
  return <MarketingLandingPage />
}
