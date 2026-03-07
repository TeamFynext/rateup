import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import QrFinalCTA from "@/components/products/QrLandingCompoents/helpers/QrFinalCTA";
import QrFooter from "@/components/products/QrLandingCompoents/helpers/QrFooter";
import QrHeader from "@/components/products/QrLandingCompoents/helpers/QrHeader";
// import QrPricingSection from "@/components/products/QrLandingCompoents/helpers/QrPricingSection";
import ScrollToTop from "@/components/products/QrLandingCompoents/helpers/ScrollTopButton";
import ComparisonSection from "@/components/products/QrLandingCompoents/shared/ComparisonSection";
import QrFeaturesGrid from "@/components/products/QrLandingCompoents/shared/QrFeaturesGrid";
import QrHeroSection from "@/components/products/QrLandingCompoents/shared/QrHeroSection";
import QrUseCases from "@/components/products/QrLandingCompoents/shared/QrUseCases";
import QrWorkFlow from "@/components/products/QrLandingCompoents/shared/QrWorkFlow";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <QrHeader />
      <main className="grow">
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
