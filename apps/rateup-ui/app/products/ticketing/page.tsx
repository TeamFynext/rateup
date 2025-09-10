import PricingSection from "@/components/products/PricingComponents/helpers/PricingSection";
import TicketFooter from "@/components/products/TicketLandingComponets/helpers/TicketFooter";
import TicketHeaderBar from "@/components/products/TicketLandingComponets/helpers/TicketHeaderBar";
import BenefitsSection from "@/components/products/TicketLandingComponets/shared/BenefitsSection";
import ClientsSection from "@/components/products/TicketLandingComponets/shared/ClientSection";
import CTASection from "@/components/products/TicketLandingComponets/shared/CTASection";
import TestimonialsSection from "@/components/products/TicketLandingComponets/shared/TestimonialsSection";
import TicketFeatureSection from "@/components/products/TicketLandingComponets/shared/TicketFeatureSection";
import TicketHero from "@/components/products/TicketLandingComponets/shared/TicketHero";
import UseCasesSection from "@/components/products/TicketLandingComponets/shared/UseCasesSection";
import WhatsAppSolutionContainer from "@/components/products/TicketLandingComponets/shared/WhatsAppSolutionContainer";

function page() {
  return (
    <div className="min-h-screen flex flex-col">
      <TicketHeaderBar />
      <main className="flex-grow">
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

export default page;
