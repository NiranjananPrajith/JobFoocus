import HeroSection from '@/components/HeroSection';
import TrustRibbon from '@/components/TrustRibbon';
import PrivacyPipeline from '@/components/PrivacyPipeline';
import FeatureBentoGrid from '@/components/FeatureBentoGrid';
import ClosingCTA from '@/components/ClosingCTA';

export default function FeaturesPageContent() {
  return (
    <div className="w-full">
      <HeroSection />
      <TrustRibbon />
      <PrivacyPipeline />
      <FeatureBentoGrid />
      <ClosingCTA />
    </div>
  );
}
