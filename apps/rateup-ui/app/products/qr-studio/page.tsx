import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import QrFinalCTA from "@/components/products/components/QrLandingCompoents/helpers/QrFinalCTA";
import QrFooter from "@/components/products/components/QrLandingCompoents/helpers/QrFooter";
import QrHeader from "@/components/products/components/QrLandingCompoents/helpers/QrHeader";
// import QrPricingSection from "@/components/products/components/QrLandingCompoents/helpers/QrPricingSection";
import ScrollToTop from "@/components/products/components/QrLandingCompoents/helpers/ScrollTopButton";
import ComparisonSection from "@/components/products/components/QrLandingCompoents/shared/ComparisonSection";
import QrFeaturesGrid from "@/components/products/components/QrLandingCompoents/shared/QrFeaturesGrid";
import QrHeroSection from "@/components/products/components/QrLandingCompoents/shared/QrHeroSection";
import QrUseCases from "@/components/products/components/QrLandingCompoents/shared/QrUseCases";
import QrWorkFlow from "@/components/products/components/QrLandingCompoents/shared/QrWorkFlow";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <QrHeader />
      <main className="flex-grow">
        <QrHeroSection />
        <ComparisonSection />
        <QrFeaturesGrid />
        <QrUseCases />
        <QrWorkFlow />
        <PricingSection />
        <QrFinalCTA />
      </main>
      <QrFooter />
      <ScrollToTop />
    </div>
  );
}

export default page;
