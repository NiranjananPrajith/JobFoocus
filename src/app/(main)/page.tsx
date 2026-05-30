import FeaturesPageContent from '@/app/(main)/features/features-content';

export const metadata = {
  title: 'Job Foocus — Your Job Search, Organized',
  openGraph: {
    title: 'Job Foocus — Your Job Search, Organized',
    description: 'Organize, track, and land your next job. Job Foocus helps you manage every application with tailored resumes, cover letters, and follow-up reminders.',
    url: 'https://jobfoocus.com',
    siteName: 'Job Foocus',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://jobfoocus.com/homepageSS.webp',
        width: 1200,
        height: 630,
        alt: 'Job Foocus Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Foocus — Your Job Search, Organized',
    description: 'Organize, track, and land your next job. Job Foocus helps you manage every application with tailored resumes, cover letters, and follow-up reminders.',
    images: ['https://jobfoocus.com/homepageSS.webp'],
  },
};

export default function HomePage() {
  return <FeaturesPageContent />;
}
