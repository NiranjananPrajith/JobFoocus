import MarketingHeader from './components/MarketingHeader';
import MarketingFooter from './components/MarketingFooter';
import './homepage.css';


export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="jf-site">
      <a className="skip" href="#main">Skip to content</a>
      <div className="page">
        <MarketingHeader />
        {children}
        <MarketingFooter />
      </div>
    </div>
  )
}
