import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import TestimonialCTASection from "@/components/products/TestimonialGateway/helpers/TestimonialCTASection";
import TestimonialFAQSection from "@/components/products/TestimonialGateway/helpers/TestimonialFAQSection";
import TestimonialFooter from "@/components/products/TestimonialGateway/helpers/TestimonialFooter";
// import TestimonialPricingSection from "@/components/products/TestimonialGateway/helpers/TestimonialPricingSection";
import TestimonialHearder from "@/components/products/TestimonialGateway/helpers/TsHearder";
import SuccessStories from "@/components/products/TestimonialGateway/shared/SuccessStories";
import TestimonialCustomizer from "@/components/products/TestimonialGateway/shared/TestimonialCustomizer";
import TestimonialFeatureSection from "@/components/products/TestimonialGateway/shared/TestimonialFeatureSection";
import TestimonialFeaturesGrid from "@/components/products/TestimonialGateway/shared/TestimonialFeaturesGrid";
import TestimonialHero from "@/components/products/TestimonialGateway/shared/TestimonialHero";
import TestimonialSteps from "@/components/products/TestimonialGateway/shared/TestimonialSteps";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <TestimonialHearder />
      <main className="flex-grow">
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

export default page;
