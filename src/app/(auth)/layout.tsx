import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}