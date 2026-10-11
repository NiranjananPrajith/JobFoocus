import type { Metadata } from 'next';
import MarketingLandingPage from './MarketingLandingPage';

const title = 'JobFoocus — A simpler job hunt';
const description = 'Tailor your resume and cover letter to each job, then track every application in one place.';
export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: 'https://jobfoocus.com', siteName: 'JobFoocus', locale: 'en_US', type: 'website', images: [{ url: 'https://jobfoocus.com/images/redesign/hero.webp', width: 1536, height: 1024, alt: 'Resume and cover letter in an organized JobFoocus workspace' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['https://jobfoocus.com/images/redesign/hero.webp'] },
};
export default function Page() { return <MarketingLandingPage />; }
