import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/lib/theme-context';
import MetaPixel from '@/components/MetaPixel';
import ClarityTracker from '@/components/Clarity';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const FOUC_SCRIPT = `
try {
  var t = localStorage.getItem('jobfoocus-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch(e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=2172124703579742&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="min-h-screen bg-canvas text-ink">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <MetaPixel />
        <ClarityTracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}