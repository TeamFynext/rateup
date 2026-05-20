import { createFileRoute } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata.ts";
import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import ClientsSectionSurvey from "@/components/products/WhatsAppSurveyComponets/helpers/ClientsSectionSurvey.tsx";
import CustomerFeedbackSection from "@/components/products/WhatsAppSurveyComponets/helpers/CustomerFeedbackSection.tsx";
import WhatsAppSurveyCta from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyCta.tsx";
import { WhatsAppSurveyFaq } from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFaq.tsx";
import WhatsAppSurveyFooter from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyFooter.tsx";
import WhatsAppSurveyHeader from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyHeader.tsx";
import WhatsAppSurveyTestimonials from "@/components/products/WhatsAppSurveyComponets/helpers/WhatsAppSurveyTestimonials.tsx";
import SurverySolution from "@/components/products/WhatsAppSurveyComponets/shared/SurverySolution.tsx";
import WhatsAppSurveyAdvantage from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyAdvantage.tsx";
import WhatsAppSurveyGrowth from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyGrowth.tsx";
import WhatsAppSurveyHero from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyHero.tsx";
import WhatsAppSurveyService from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveyService.tsx";
import WhatsAppSurveySteps from "@/components/products/WhatsAppSurveyComponets/shared/WhatsAppSurveySteps.tsx";

import { productsMarkdown } from "../../../../markdown/products";
import { createMarkdownMiddleware } from "../../../../markdown/serveMarkdown";

export const Route = createFileRoute("/(marketing)/products/whatsapp-survey/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: Page,
  head: () => ({
    meta: [pageMetadata["/products/whatsapp-survey"]],
  }),
});

function Page() {
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
}
