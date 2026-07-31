import { createFileRoute } from "@tanstack/react-router";

import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection.tsx";
import TicketFooter from "@/components/products/TicketLandingComponets/helpers/TicketFooter.tsx";
import TicketHeaderBar from "@/components/products/TicketLandingComponets/helpers/TicketHeaderBar.tsx";
import BenefitsSection from "@/components/products/TicketLandingComponets/shared/BenefitsSection.tsx";
import ClientsSection from "@/components/products/TicketLandingComponets/shared/ClientSection.tsx";
import CTASection from "@/components/products/TicketLandingComponets/shared/CTASection.tsx";
import TestimonialsSection from "@/components/products/TicketLandingComponets/shared/TestimonialsSection.tsx";
import TicketFeatureSection from "@/components/products/TicketLandingComponets/shared/TicketFeatureSection.tsx";
import TicketHero from "@/components/products/TicketLandingComponets/shared/TicketHero.tsx";
import UseCasesSection from "@/components/products/TicketLandingComponets/shared/UseCasesSection.tsx";
import WhatsAppSolutionContainer from "@/components/products/TicketLandingComponets/shared/WhatsAppSolutionContainer.tsx";
import { buildPageHead } from "@/lib/metadata.ts";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

export const Route = createFileRoute("/(marketing)/products/ticketing/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: page,
  head: () => buildPageHead("/products/ticketing"),
});

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <TicketHeaderBar />
      <main className="grow">
        <TicketHero />
        <ClientsSection />
        <TicketFeatureSection />
        <WhatsAppSolutionContainer />
        <UseCasesSection />
        <TestimonialsSection />
        <BenefitsSection />
        <PricingSection />
        <CTASection />
      </main>
      <TicketFooter />
    </div>
  );
}
