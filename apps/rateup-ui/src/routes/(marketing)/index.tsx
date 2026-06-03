"use client";

import { lazy, Suspense } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import ClientLogos from "@/components/RateupHomePage/helpers/ClientLogos.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooterNew.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import AutomateInteraction from "@/components/RateupHomePage/shared/AutomateInteraction.tsx";
import FeatureCards2 from "@/components/RateupHomePage/shared/FeatureCards2New.tsx";
import Features from "@/components/RateupHomePage/shared/FeaturesNew.tsx";
import HeroAnalytics from "@/components/RateupHomePage/shared/HeroAnalyticsNew.tsx";
import HeroSection from "@/components/RateupHomePage/shared/HeroSectionNew.tsx";
import Integration from "@/components/RateupHomePage/shared/IntegrationsNew.tsx";
import LoyalityAd from "@/components/RateupHomePage/shared/LoyalityAdNew.tsx";
import MobileAppSection from "@/components/RateupHomePage/shared/MobileAppSectionNew.tsx";
import StartRateupHero from "@/components/RateupHomePage/shared/StartRateup.tsx";

import { homepageMarkdown } from "../../markdown/homepage";
import { createMarkdownMiddleware } from "../../markdown/serveMarkdown";

const SupportWidget = lazy(
  () => import("@/components/app&services/support-widget.tsx"),
);
const setApiCatalogHeader = createServerFn().handler(async () => {
  setResponseHeader(
    "Link",
    '</.well-known/api-catalog>; rel="api-catalog", <https://docs.rateup.app>; rel="service-doc"',
  );
});

const homePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RateUp",
  url: "https://rateup.app",
  logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  description:
    "RateUp is an AI-powered omnichannel customer engagement platform that integrates WhatsApp Business API, feedback, loyalty, chat automation, and a unified inbox to help businesses boost retention and repeat sales.",
  foundingDate: "2023",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@rateup.app",
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/rateupapp",
    "https://twitter.com/rateupapp",
    "https://www.instagram.com/rateupapp",
    "https://www.facebook.com/rateupapp",
    "https://www.threads.com/@rateupsoftware",
    "https://www.youtube.com/@TeamRateup",
  ],
  brand: {
    "@type": "Brand",
    name: "RateUp",
    logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    reviewCount: "3987",
    bestRating: "5",
  },
};

export const Route = createFileRoute("/(marketing)/")({
  server: {
    middleware: [createMarkdownMiddleware(homepageMarkdown)],
  },
  component: RouteComponent,
  loader: async () => {
    await setApiCatalogHeader();
    return null;
  },
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homePageJsonLd),
      },
    ],
  }),
});

function RouteComponent() {
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
      <Suspense fallback={null}>
        <SupportWidget
          orgId={import.meta.env.VITE_ROOT_ORG || ""}
          token={import.meta.env.VITE_ROOT_TOKEN || ""}
        />
      </Suspense>
    </Layout>
  );
}
