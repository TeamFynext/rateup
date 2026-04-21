"use client";

import dynamic from "next/dynamic";

import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooterNew";
import Layout from "@/components/RateupHomePage/Layout";
import AutomateInteraction from "@/components/RateupHomePage/shared/AutomateInteraction";
import FeatureCards2 from "@/components/RateupHomePage/shared/FeatureCards2New";
import Features from "@/components/RateupHomePage/shared/FeaturesNew";
import HeroAnalytics from "@/components/RateupHomePage/shared/HeroAnalyticsNew";
import HeroSection from "@/components/RateupHomePage/shared/HeroSectionNew";
import Integration from "@/components/RateupHomePage/shared/IntegrationsNew";
import LoyalityAd from "@/components/RateupHomePage/shared/LoyalityAdNew";
import MobileAppSection from "@/components/RateupHomePage/shared/MobileAppSectionNew";
import StartRateupHero from "@/components/RateupHomePage/shared/StartRateup";

const SupportWidget = dynamic(
  () => import("@/components/app&services/support-widget"),
  { ssr: false },
);

const page = () => {
  return (
    <Layout>
      <HeroSection />
      <HeroAnalytics />
      <ClientLogos />
      <FeatureCards2 />
      <LoyalityAd />
      <Features />
      <AutomateInteraction />
      {/* <Clients/> */}
      <Integration />
      <MobileAppSection />
      <StartRateupHero />
      <HomePageFooter />
      <SupportWidget
        orgId={process.env.NEXT_PUBLIC_ROOT_ORG}
        token={process.env.NEXT_PUBLIC_ROOT_TOKEN}
      />
    </Layout>
  );
};

export default page;
