import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import { ReputationManagement } from "@/components/products/components/ReviewWithAiComponents/helpers/ReputationManagement";
import ReviewAiHeader from "@/components/products/components/ReviewWithAiComponents/helpers/ReviewAiHeader";
import ReviewCta from "@/components/products/components/ReviewWithAiComponents/helpers/ReviewCta";
import ReviewAiFeatures from "@/components/products/components/ReviewWithAiComponents/shared/ReviewAiFeatures";
import ReviewAiHero from "@/components/products/components/ReviewWithAiComponents/shared/ReviewAiHero";
import ReviewAiHowItWorks from "@/components/products/components/ReviewWithAiComponents/shared/ReviewAiHowItWorks";
// import ReviewPricing from "@/components/products/components/ReviewWithAiComponents/shared/ReviewPricing";
import ReviewTestimonials from "@/components/products/components/ReviewWithAiComponents/shared/ReviewTestimonials";
import TicketFooter from "@/components/products/components/TicketLandingComponets/helpers/TicketFooter";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <ReviewAiHeader />
      <main className="flex-grow">
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

export default page;
