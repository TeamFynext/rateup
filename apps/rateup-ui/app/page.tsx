"use client";

import dynamic from "next/dynamic";

import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter";
import ScrollToTop from "@/components/RateupHomePage/helpers/ScrollToTop";
import Layout from "@/components/RateupHomePage/Layout";
import AudienceOverview from "@/components/RateupHomePage/shared/AudienceOverview";
import CallToAction from "@/components/RateupHomePage/shared/CallToAction";
import FeatureCards1 from "@/components/RateupHomePage/shared/FeatureCard1";
import FeatureCards2 from "@/components/RateupHomePage/shared/FeatureCards2";
import HeroAnalytics from "@/components/RateupHomePage/shared/HeroAnalytics";
import HeroMarketingDashboard from "@/components/RateupHomePage/shared/HeroMarketingDashboard";
import HeroSection from "@/components/RateupHomePage/shared/HeroSection";
import HomePageQrSection from "@/components/RateupHomePage/shared/HomePageQrSection";
import IntegrationHero from "@/components/RateupHomePage/shared/IntegrationAndClients";
import LoyalityAd from "@/components/RateupHomePage/shared/LoyalityAd";
import MobileAppSection from "@/components/RateupHomePage/shared/MobileAppSection";
import ObstaclesOverview from "@/components/RateupHomePage/shared/ObstaclesOverview";
import TabComponent from "@/components/RateupHomePage/shared/TabComponent";

const SupportWidget = dynamic(
  () => import("@/components/app&services/support-widget"),
  { ssr: false },
);

const page = () => {
  return (
    <Layout>
      <HeroSection />
      <HeroMarketingDashboard />
      <HeroAnalytics />
      <ClientLogos />
      <ObstaclesOverview />
      <TabComponent />
      <FeatureCards1 />
      <FeatureCards2 />
      <LoyalityAd />
      <IntegrationHero />
      <HomePageQrSection />
      <AudienceOverview />
      <MobileAppSection />
      <CallToAction />
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
