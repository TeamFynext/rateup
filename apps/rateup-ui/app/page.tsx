"use client";

import dynamic from "next/dynamic";

import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import ScrollToTop from "@/components/RateupHomePage/helpers/ScrollToTop";
import Layout from "@/components/RateupHomePage/Layout";
import AudienceOverview from "@/components/RateupHomePage/shared/AudienceOverview";
import AutomateInteraction from "@/components/RateupHomePage/shared/AutomateInteraction";
import CallToAction from "@/components/RateupHomePage/shared/CallToAction";
import FeatureCards1 from "@/components/RateupHomePage/shared/FeatureCard1";
import FeatureCards2 from "@/components/RateupHomePage/shared/FeatureCards2";
import Features from "@/components/RateupHomePage/shared/FeaturesNew";
import HeroAnalytics from "@/components/RateupHomePage/shared/HeroAnalyticsNew";
import HeroMarketingDashboard from "@/components/RateupHomePage/shared/HeroMarketingDashboard";
import HeroSection from "@/components/RateupHomePage/shared/HeroSectionNew";
import HomePageQrSection from "@/components/RateupHomePage/shared/HomePageQrSection";
import IntegrationHero from "@/components/RateupHomePage/shared/IntegrationAndClients";
import Integration from "@/components/RateupHomePage/shared/IntegrationsNew";
import LoyalityAd from "@/components/RateupHomePage/shared/LoyalityAdNew";
import MobileAppSection from "@/components/RateupHomePage/shared/MobileAppSectionNew";
import ObstaclesOverview from "@/components/RateupHomePage/shared/ObstaclesOverview";
import StartRateupHero from "@/components/RateupHomePage/shared/StartRateup";
import TabComponent from "@/components/RateupHomePage/shared/TabComponent";

const SupportWidget = dynamic(
  () => import("@/components/app&services/support-widget"),
  { ssr: false },
);

const page = () => {
  return (
    <Layout>
      <HeroSection />
      {/* <HeroMarketingDashboard /> */}
      <HeroAnalytics />
      <ClientLogos />
      <TabComponent />
      {/* <ObstaclesOverview /> */}
      {/* <FeatureCards1 /> */}
      {/* <FeatureCards2 /> */}
      <LoyalityAd />
      <Features />
      <AutomateInteraction />
      <Integration />
      {/* <IntegrationHero /> */}
      {/* <HomePageQrSection /> */}
      {/* <AudienceOverview /> */}
      <MobileAppSection />
      {/* <CallToAction /> */}
      <StartRateupHero />
      <HomePageFooter />
      <ScrollToTop />
      <SupportWidget
        orgId={process.env.NEXT_PUBLIC_ROOT_ORG}
        token={process.env.NEXT_PUBLIC_ROOT_TOKEN}
      />
    </Layout>
  );
};

export default page;
