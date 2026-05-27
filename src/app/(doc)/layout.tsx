import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function DocLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="no-print">
        <NavBar />
      </div>
      <main className="flex-1 w-full">
        {children}
      </main>
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
