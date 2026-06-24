import { createFileRoute } from "@tanstack/react-router";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import TestimonialCTASection from "@/components/products/TestimonialGateway/helpers/TestimonialCTASection.tsx";
import TestimonialFAQSection from "@/components/products/TestimonialGateway/helpers/TestimonialFAQSection.tsx";
import TestimonialFooter from "@/components/products/TestimonialGateway/helpers/TestimonialFooter.tsx";
// import TestimonialPricingSection from "@/components/products/TestimonialGateway/helpers/TestimonialPricingSection";
import TestimonialHearder from "@/components/products/TestimonialGateway/helpers/TsHearder.tsx";
import SuccessStories from "@/components/products/TestimonialGateway/shared/SuccessStories.tsx";
import TestimonialCustomizer from "@/components/products/TestimonialGateway/shared/TestimonialCustomizer.tsx";
import TestimonialFeatureSection from "@/components/products/TestimonialGateway/shared/TestimonialFeatureSection.tsx";
import TestimonialFeaturesGrid from "@/components/products/TestimonialGateway/shared/TestimonialFeaturesGrid.tsx";
import TestimonialHero from "@/components/products/TestimonialGateway/shared/TestimonialHero.tsx";
import TestimonialSteps from "@/components/products/TestimonialGateway/shared/TestimonialSteps.tsx";

export const Route = createFileRoute("/(marketing)/products/testimonial-gateway/")({
  component: page,
});

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <TestimonialHearder />
      <main className="grow">
        <TestimonialHero />
        <TestimonialSteps />
        <TestimonialFeaturesGrid />
        <TestimonialFeatureSection />
        <SuccessStories />
        <TestimonialCustomizer />
        {/* <TestimonialPricingSection /> */}
        <TestimonialFAQSection />
        <PricingSection />
        <TestimonialCTASection />
      </main>
      <TestimonialFooter />
    </div>
  );
}
