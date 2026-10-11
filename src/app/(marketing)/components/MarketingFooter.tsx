import Image from 'next/image';
import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/" aria-label="JobFoocus home"><Image src="/icon_wide.webp" alt="JobFoocus" width={1920} height={546} sizes="160px" /></Link>
          <p>Tailor your documents.<br />Keep your job hunt in focus.</p>
          <span className="footer-note"><span className="dot" aria-hidden="true" />Made for your next move</span>
        </div>
        <nav className="footer-group" aria-label="Product links">
          <h2>Product</h2><a href="/#how-it-works">How it works</a><a href="/#features">Features</a>
          <Link href="/pricing">Pricing</Link><Link href="/extension-install">Browser extension</Link>
        </nav>
        <nav className="footer-group" aria-label="Help links">
          <h2>Help &amp; resources</h2><a href="/#questions">Common questions</a><Link href="/support">Contact support</Link><a href="/#how-it-works">How to get started</a>
        </nav>
        <nav className="footer-group" aria-label="Account links">
          <h2>Your account</h2><Link href="/signup">Get started free</Link><Link href="/login">Log in</Link><Link href="/dashboard">Dashboard</Link>
          <a className="footer-back" href="#main">Back to top <span aria-hidden="true">↑</span></a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getUTCFullYear()} JobFoocus</span>
        <nav className="footer-legal" aria-label="Legal links"><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-of-service">Terms of service</Link></nav>
      </div>
    </footer>
  );
}
