import { createFileRoute } from "@tanstack/react-router";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import { ReputationManagement } from "@/components/products/ReviewWithAiComponents/helpers/ReputationManagement.tsx";
import ReviewAiHeader from "@/components/products/ReviewWithAiComponents/helpers/ReviewAiHeader.tsx";
import ReviewCta from "@/components/products/ReviewWithAiComponents/helpers/ReviewCta.tsx";
import ReviewAiFeatures from "@/components/products/ReviewWithAiComponents/shared/ReviewAiFeatures.tsx";
import ReviewAiHero from "@/components/products/ReviewWithAiComponents/shared/ReviewAiHero.tsx";
import ReviewAiHowItWorks from "@/components/products/ReviewWithAiComponents/shared/ReviewAiHowItWorks.tsx";
// import ReviewPricing from "@/components/products/ReviewWithAiComponents/shared/ReviewPricing";
import ReviewTestimonials from "@/components/products/ReviewWithAiComponents/shared/ReviewTestimonials.tsx";
import TicketFooter from "@/components/products/TicketLandingComponets/helpers/TicketFooter.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/products/ai-review/")({
  component: page,
  head: () => buildPageHead("/products/ai-review"),
});

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <ReviewAiHeader />
      <main className="grow">
        <ReviewAiHero />
        <ReviewAiHowItWorks />
        <ReviewAiFeatures />
        <ReputationManagement />
        <ReviewTestimonials />
        {/* <ReviewPricing/> */}
        <PricingSection color2="#009987" color1="#1cad9f" />
        <ReviewCta />
      </main>
      <TicketFooter />
    </div>
  );
}
