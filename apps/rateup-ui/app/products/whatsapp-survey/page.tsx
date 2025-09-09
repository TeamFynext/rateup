import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import ClientsSectionSurvey from "@/components/products/components/WhatsAppSurveyComponets/helpers/ClientsSectionSurvey";
import CustomerFeedbackSection from "@/components/products/components/WhatsAppSurveyComponets/helpers/CustomerFeedbackSection";
import WhatsAppSurveyCta from "@/components/products/components/WhatsAppSurveyComponets/helpers/WhatsAppSurveyCta";
import { WhatsAppSurveyFaq } from "@/components/products/components/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFaq";
import WhatsAppSurveyFooter from "@/components/products/components/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFooter";
import WhatsAppSurveyHeader from "@/components/products/components/WhatsAppSurveyComponets/helpers/WhatsAppSurveyHeader";
import WhatsAppSurveyTestimonials from "@/components/products/components/WhatsAppSurveyComponets/helpers/WhatsAppSurveyTestimonials";
import SurverySolution from "@/components/products/components/WhatsAppSurveyComponets/shared/SurverySolution";
import WhatsAppSurveyAdvantage from "@/components/products/components/WhatsAppSurveyComponets/shared/WhatsAppSurveyAdvantage";
import WhatsAppSurveyGrowth from "@/components/products/components/WhatsAppSurveyComponets/shared/WhatsAppSurveyGrowth";
import WhatsAppSurveyHero from "@/components/products/components/WhatsAppSurveyComponets/shared/WhatsAppSurveyHero";
import WhatsAppSurveyService from "@/components/products/components/WhatsAppSurveyComponets/shared/WhatsAppSurveyService";
import WhatsAppSurveySteps from "@/components/products/components/WhatsAppSurveyComponets/shared/WhatsAppSurveySteps";

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
