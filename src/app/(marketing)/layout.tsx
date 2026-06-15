import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas selection:bg-primary selection:text-white">
      <NavBar />
      {children}
      <Footer />
    </div>
  )
}
