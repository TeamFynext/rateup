import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import { ReputationManagement } from "@/components/products/ReviewWithAiComponents/helpers/ReputationManagement";
import ReviewAiHeader from "@/components/products/ReviewWithAiComponents/helpers/ReviewAiHeader";
import ReviewCta from "@/components/products/ReviewWithAiComponents/helpers/ReviewCta";
import ReviewAiFeatures from "@/components/products/ReviewWithAiComponents/shared/ReviewAiFeatures";
import ReviewAiHero from "@/components/products/ReviewWithAiComponents/shared/ReviewAiHero";
import ReviewAiHowItWorks from "@/components/products/ReviewWithAiComponents/shared/ReviewAiHowItWorks";
// import ReviewPricing from "@/components/products/ReviewWithAiComponents/shared/ReviewPricing";
import ReviewTestimonials from "@/components/products/ReviewWithAiComponents/shared/ReviewTestimonials";
import TicketFooter from "@/components/products/TicketLandingComponets/helpers/TicketFooter";

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
