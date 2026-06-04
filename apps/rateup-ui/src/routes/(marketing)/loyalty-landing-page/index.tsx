import { createFileRoute } from "@tanstack/react-router";

import { useRevealAnimation } from "@/hooks/useRevealAnimation";
import CustomerProfiles from "@/components/LoyaltyLandingPage/CustomerProfiles";
import Faq from "@/components/LoyaltyLandingPage/Faq";
import Hero from "@/components/LoyaltyLandingPage/Hero";
import HowItWorks from "@/components/LoyaltyLandingPage/HowItWorks";
import Integrations from "@/components/LoyaltyLandingPage/Integrations";
import Trusted from "@/components/LoyaltyLandingPage/Trusted";
import WhyWhatsApp from "@/components/LoyaltyLandingPage/WhyWhatsApp";
import HomePageFooterNew from "@/components/RateupHomePage/helpers/HomePageFooterNew";
import Layout from "@/components/RateupHomePage/Layout";

export const Route = createFileRoute("/(marketing)/loyalty-landing-page/")({
  component: LoyaltyLandingPage,
});

function LoyaltyLandingPage() {
  useRevealAnimation();
  return (
    <Layout navbarClassName="heroNav">
      <span id="top"></span>
      <Hero />
      <HowItWorks />
      <WhyWhatsApp />
      <CustomerProfiles />
      <Integrations />
      <Trusted />
      <Faq />
      <HomePageFooterNew />
    </Layout>
  );
}
