import { createFileRoute } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { useEffect, useRef } from "react";
import { z } from "zod";

import { useTrackVisitMutation } from "@/backend/referrals/referrals.query";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import CaseStudies from "@/components/RateupHomePage/shared/CaseStudies";
import Features from "@/components/RateupHomePage/shared/Features";
import HeroSectionNew from "@/components/RateupHomePage/shared/HeroSectionNew";
import HowItWorks from "@/components/RateupHomePage/shared/HowItWorks";
import Integrations from "@/components/RateupHomePage/shared/Integrations";
import LoyaltySection from "@/components/RateupHomePage/shared/LoyaltySection";
import Problem from "@/components/RateupHomePage/shared/Problem";
import TrustedBy from "@/components/RateupHomePage/shared/TrustedBy";
import { buildPageHead } from "@/lib/metadata";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

import { homepageMarkdown } from "../../markdown/homepage";
import { createMarkdownMiddleware } from "../../markdown/serveMarkdown";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const apiCatalogMiddleware = createMiddleware().server(async ({ next }) => {
  setResponseHeader(
    "Link",
    '</.well-known/api-catalog>; rel="api-catalog", <https://docs.rateup.app>; rel="service-doc"',
  );
  return next();
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

const marketingSearchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/(marketing)/")({
  validateSearch: (search) => marketingSearchSchema.parse(search),
  server: {
    middleware: [createMarkdownMiddleware(homepageMarkdown), apiCatalogMiddleware],
  },
  component: RouteComponent,
  head: () => ({
    ...buildPageHead("/"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homePageJsonLd),
      },
    ],
  }),
});

function RouteComponent() {
  const { ref } = Route.useSearch();
  const trackVisitMutation = useTrackVisitMutation();
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (ref && trackedRef.current !== ref) {
      const existingCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("referral_code="));
      const existingRef = existingCookie?.split("=")[1];

      // If a referral code is already stored in the cookie, ignore any new ones (first-touch attribution)
      if (!existingRef) {
        document.cookie = `referral_code=${ref}; path=/; max-age=2592000; SameSite=Lax`;
        trackVisitMutation.mutate(ref);
      }

      trackedRef.current = ref;
    }
  }, [ref, trackVisitMutation]);

  return (
    <Layout contentClassName={styles.theme}>
      <HeroSectionNew />

      {/* Wrap everything else in the light theme container */}
      <div className={styles.lightSection}>
        <TrustedBy />
        <Problem />
        <HowItWorks />
        <Features />
        <CaseStudies />
        <Integrations />
        <LoyaltySection />
      </div>
    </Layout>
  );
}
