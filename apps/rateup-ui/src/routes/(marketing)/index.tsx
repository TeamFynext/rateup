"use client";

import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import Layout from "@/components/RateupHomePage/Layout.tsx";
import Features from "@/components/RateupHomePage/shared/Features";
import HeroSectionNew from "@/components/RateupHomePage/shared/HeroSectionNew";
import HowItWorks from "@/components/RateupHomePage/shared/HowItWorks";
import LoyaltySection from "@/components/RateupHomePage/shared/LoyaltySection";
import Problem from "@/components/RateupHomePage/shared/Problem";
import TrustedBy from "@/components/RateupHomePage/shared/TrustedBy";
import styles from "@/styles/commonCssModules/homepagecss.module.css";
import {
  rateupLogoStackedWhiteTransparent,
  rateupUrl,
} from "@/utils/constants.ts";

import { homepageMarkdown } from "../../markdown/homepage";
import { createMarkdownMiddleware } from "../../markdown/serveMarkdown";

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
  logo: rateupLogoStackedWhiteTransparent,
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
    logo: rateupLogoStackedWhiteTransparent,
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
    links: [
      {
        rel: "canonical",
        href: rateupUrl,
      },
    ],
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
    <Layout contentClassName={styles.theme}>
      <HeroSectionNew />
      <TrustedBy />
      <Problem />
      <HowItWorks />
      <Features />
      <LoyaltySection />
    </Layout>
  );
}
