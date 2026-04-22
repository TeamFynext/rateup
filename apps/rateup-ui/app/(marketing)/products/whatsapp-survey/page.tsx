import { Metadata } from "next";

import { pageMetadata } from "@/lib/metadata";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import ClientsSectionSurvey from "@/components/products/WhatsAppSurveyComponets/helpers/ClientsSectionSurvey";
import CustomerFeedbackSection from "@/components/products/WhatsAppSurveyComponets/helpers/CustomerFeedbackSection";
import WhatsAppSurveyCta from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyCta";
import { WhatsAppSurveyFaq } from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFaq";
import WhatsAppSurveyFooter from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFooter";
import WhatsAppSurveyHeader from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyHeader";
import WhatsAppSurveyTestimonials from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyTestimonials";
import SurverySolution from "@/components/products/WhatsAppSurveyComponets/shared/SurverySolution";
import WhatsAppSurveyAdvantage from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyAdvantage";
import WhatsAppSurveyGrowth from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyGrowth";
import WhatsAppSurveyHero from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyHero";
import WhatsAppSurveyService from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyService";
import WhatsAppSurveySteps from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveySteps";

export const metadata: Metadata = pageMetadata["/products/whatsapp-survey"];

const page = () => {
  return (
    <div className="min-h-screen flex flex-col ">
      <WhatsAppSurveyHeader />
      <main>
        <WhatsAppSurveyHero />
        <ClientsSectionSurvey />
        <CustomerFeedbackSection />
        <SurverySolution />
        <WhatsAppSurveySteps />
        <WhatsAppSurveyGrowth />
        <WhatsAppSurveyService />
        <WhatsAppSurveyTestimonials />
        <WhatsAppSurveyAdvantage />
        <WhatsAppSurveyFaq />
        <PricingSection color2="#009987" color1="#1cad9f" />
        <WhatsAppSurveyCta />
      </main>
      <WhatsAppSurveyFooter />
    </div>
  );
};

export default page;
