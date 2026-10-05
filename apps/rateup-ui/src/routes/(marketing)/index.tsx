import { createFileRoute } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { useEffect, useRef } from "react";

import Layout from "@/components/RateupHomePage/Layout.tsx";
import CaseStudies from "@/components/RateupHomePage/shared/CaseStudies";
import Features from "@/components/RateupHomePage/shared/Features";
import HeroSectionNew from "@/components/RateupHomePage/shared/HeroSectionNew";
import HowItWorks from "@/components/RateupHomePage/shared/HowItWorks";
import Integrations from "@/components/RateupHomePage/shared/Integrations";
import LoyaltySection from "@/components/RateupHomePage/shared/LoyaltySection";
import Overview from "@/components/RateupHomePage/shared/Overview";
import Problem from "@/components/RateupHomePage/shared/Problem";
import TrustedBy from "@/components/RateupHomePage/shared/TrustedBy";
import { buildPageHead } from "@/lib/metadata";
import { rateupLogoOg } from "@/utils/constants.ts";
import { optionalString } from "@/utils/search.ts";

import { homepageMarkdown } from "../../markdown/homepage";
import { createMarkdownMiddleware } from "../../markdown/serveMarkdown";

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
  logo: rateupLogoOg,
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
    logo: rateupLogoOg,
  },
  // aggregateRating removed: Google's review-snippet policy requires the reviews to be
  // visible on the page itself. Self-reported ratings with no on-page reviews are a
  // manual-action risk. Re-add it only alongside real, rendered reviews.
};

export const Route = createFileRoute("/(marketing)/")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({
    ref: optionalString(search.ref),
  }),
  server: {
    middleware: [createMarkdownMiddleware(homepageMarkdown), apiCatalogMiddleware],
  },
  component: RouteComponent,
  head: () => buildPageHead("/", { jsonLd: homePageJsonLd }),
});

function RouteComponent() {
  const { ref } = Route.useSearch();
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
        // Loaded only when there is a referral to record: the API client is axios.
        import("@/backend/referrals/referrals.api")
          .then(({ trackVisit }) => trackVisit(ref))
          .catch((error: unknown) => console.error("Error tracking visit:", error));
      }

      trackedRef.current = ref;
    }
  }, [ref]);

  return (
    <Layout>
      <HeroSectionNew />
      <Overview />
      <TrustedBy />
      <Problem />
      <HowItWorks />
      <Features />
      <CaseStudies />
      <Integrations />
      <LoyaltySection />
    </Layout>
  );
}
