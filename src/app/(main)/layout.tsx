import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Job Foocus',
  description: 'Job application tracker',
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <NavBar />
      <div id="modal-root" />
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-8 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
