import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import TestimonialCTASection from "@/components/products/components/TestimonialGateway/helpers/TestimonialCTASection";
import TestimonialFAQSection from "@/components/products/components/TestimonialGateway/helpers/TestimonialFAQSection";
import TestimonialFooter from "@/components/products/components/TestimonialGateway/helpers/TestimonialFooter";
// import TestimonialPricingSection from "@/components/products/components/TestimonialGateway/helpers/TestimonialPricingSection";
import TestimonialHearder from "@/components/products/components/TestimonialGateway/helpers/TsHearder";
import SuccessStories from "@/components/products/components/TestimonialGateway/shared/SuccessStories";
import TestimonialCustomizer from "@/components/products/components/TestimonialGateway/shared/TestimonialCustomizer";
import TestimonialFeatureSection from "@/components/products/components/TestimonialGateway/shared/TestimonialFeatureSection";
import TestimonialFeaturesGrid from "@/components/products/components/TestimonialGateway/shared/TestimonialFeaturesGrid";
import TestimonialHero from "@/components/products/components/TestimonialGateway/shared/TestimonialHero";
import TestimonialSteps from "@/components/products/components/TestimonialGateway/shared/TestimonialSteps";

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
