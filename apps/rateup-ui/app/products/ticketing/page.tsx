import PricingSection from "@/components/products/components/PricingComponents/helpers/PricingSection";
import TicketFooter from "@/components/products/components/TicketLandingComponets/helpers/TicketFooter";
import TicketHeaderBar from "@/components/products/components/TicketLandingComponets/helpers/TicketHeaderBar";
import BenefitsSection from "@/components/products/components/TicketLandingComponets/shared/BenefitsSection";
import ClientsSection from "@/components/products/components/TicketLandingComponets/shared/ClientSection";
import CTASection from "@/components/products/components/TicketLandingComponets/shared/CTASection";
import TestimonialsSection from "@/components/products/components/TicketLandingComponets/shared/TestimonialsSection";
import TicketFeatureSection from "@/components/products/components/TicketLandingComponets/shared/TicketFeatureSection";
import TicketHero from "@/components/products/components/TicketLandingComponets/shared/TicketHero";
import UseCasesSection from "@/components/products/components/TicketLandingComponets/shared/UseCasesSection";
import WhatsAppSolutionContainer from "@/components/products/components/TicketLandingComponets/shared/WhatsAppSolutionContainer";

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
