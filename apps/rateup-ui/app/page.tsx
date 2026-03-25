"use client";

import dynamic from "next/dynamic";

import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooterNew";
import ScrollToTop from "@/components/RateupHomePage/helpers/ScrollToTop";
import Layout from "@/components/RateupHomePage/Layout";
import RateUpLanding from "@/components/RateupHomePage/RateUpLanding";
import AutomateInteraction from "@/components/RateupHomePage/shared/AutomateInteraction";
import Clients from "@/components/RateupHomePage/shared/ClientNew";
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
      <RateUpLanding />
    </Layout>
  );
};

export default page;
