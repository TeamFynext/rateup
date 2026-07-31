import { createFileRoute } from "@tanstack/react-router";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import QrFinalCTA from "@/components/products/QrLandingCompoents/helpers/QrFinalCTA.tsx";
import QrFooter from "@/components/products/QrLandingCompoents/helpers/QrFooter.tsx";
import QrHeader from "@/components/products/QrLandingCompoents/helpers/QrHeader.tsx";
// import QrPricingSection from "@/components/products/QrLandingCompoents/helpers/QrPricingSection";
import ScrollToTop from "@/components/products/QrLandingCompoents/helpers/ScrollTopButton.tsx";
import ComparisonSection from "@/components/products/QrLandingCompoents/shared/ComparisonSection.tsx";
import QrFeaturesGrid from "@/components/products/QrLandingCompoents/shared/QrFeaturesGrid.tsx";
import QrHeroSection from "@/components/products/QrLandingCompoents/shared/QrHeroSection.tsx";
import QrUseCases from "@/components/products/QrLandingCompoents/shared/QrUseCases.tsx";
import QrWorkFlow from "@/components/products/QrLandingCompoents/shared/QrWorkFlow.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/products/qr-studio/")({
  component: page,
  head: () => buildPageHead("/products/qr-studio"),
});

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
