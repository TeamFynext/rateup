import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import BusinessTypes from "@/components/products/components/Whatsapp-loyalty/helpers/BusinessTypes";
import CTASection from "@/components/products/components/Whatsapp-loyalty/helpers/CTASection";
import LoyalityHeader from "@/components/products/components/Whatsapp-loyalty/helpers/LoyalityHeader";
import Testimonials from "@/components/products/components/Whatsapp-loyalty/helpers/Testimonials";
import WhatsAppLoyalityFooter from "@/components/products/components/Whatsapp-loyalty/helpers/WhatsAppLoyalityFooter";
import DidYouKnow from "@/components/products/components/Whatsapp-loyalty/shared/DidYouKnow";
import { Faq } from "@/components/products/components/Whatsapp-loyalty/shared/Faq";
import FeaturesWhatsApp from "@/components/products/components/Whatsapp-loyalty/shared/FeaturesWhatsApp";
import Hero from "@/components/products/components/Whatsapp-loyalty/shared/Hero";
import HowItWorks from "@/components/products/components/Whatsapp-loyalty/shared/HowItWorks";
import LaunchAnalyzeScale from "@/components/products/components/Whatsapp-loyalty/shared/LaunchAnalyzeScale";
import LoyaltySteps from "@/components/products/components/Whatsapp-loyalty/shared/LoyaltySteps";
import ShopifyIntegration from "@/components/products/components/Whatsapp-loyalty/shared/ShopifyIntegration";
import WhatsAppBroadcast from "@/components/products/components/Whatsapp-loyalty/shared/WhatsAppBroadcast";
import WhatsAppTemplate from "@/components/products/components/Whatsapp-loyalty/shared/WhatsAppTemplate";

function page() {
  return (
    <div className="min-h-screen flex flex-col ">
      <LoyalityHeader />
      <main>
        <Hero />
        <DidYouKnow />
        <LoyaltySteps />
        <LaunchAnalyzeScale />
        <WhatsAppTemplate />
        <WhatsAppBroadcast />
        <HowItWorks />
        <FeaturesWhatsApp />
        <Testimonials />
        <BusinessTypes />
        <ShopifyIntegration />
        <Faq />
        <PricingSection color2="#009987" color1="#1cad9f" />
        <CTASection />
      </main>
      <WhatsAppLoyalityFooter />
    </div>
  );
}

export default page;
