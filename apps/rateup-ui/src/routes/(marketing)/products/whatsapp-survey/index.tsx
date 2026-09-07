import { createFileRoute } from "@tanstack/react-router";

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
import { faqs } from "@/components/products/WhatsAppSurveyComponets/WhatsAppSurveyConstants.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";

import { productsMarkdown } from "../../../../markdown/products";
import { createMarkdownMiddleware } from "../../../../markdown/serveMarkdown";

const PATH = "/products/whatsapp-survey";

/* The FAQ graph is built from the same `faqs` array the page renders, so the markup can never
   claim an answer the page does not show. */
const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp WhatsApp Survey",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp sends NPS, CSAT and custom surveys as native WhatsApp Flows forms, with score-based follow-ups and real-time results.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Survey Software",
    operatingSystem: "Web, Android, iOS",
    featureList: [
      "NPS surveys delivered inside WhatsApp",
      "CSAT and custom question types",
      "Native in-chat forms via WhatsApp Flows",
      "Score-based follow-up branching",
      "Real-time results and trend reporting",
      "Triggers from store, POS and CRM events",
    ],
    publisher,
  },
  faqPage(faqs),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "WhatsApp Survey", path: PATH },
  ]),
  webPage(
    PATH,
    "WhatsApp Survey Tool - Run NPS & CSAT Surveys in Chat",
    "Send NPS, CSAT and custom surveys as native WhatsApp Flows forms, with score-based follow-ups and real-time results.",
  ),
);

export const Route = createFileRoute("/(marketing)/products/whatsapp-survey/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: Page,
  head: () => buildPageHead(PATH, { jsonLd }),
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
