import { createFileRoute } from "@tanstack/react-router";

import Comparison from "@/components/products/OmnichannelInbox/Comparison";
import CTABand from "@/components/products/OmnichannelInbox/CTABand";
import Features from "@/components/products/OmnichannelInbox/Features";
import Hero from "@/components/products/OmnichannelInbox/Hero";
import HowItWorks from "@/components/products/OmnichannelInbox/HowItWorks";
import Integrations from "@/components/products/OmnichannelInbox/Integrations";
import Problem from "@/components/products/OmnichannelInbox/Problem";
import ProductIntro from "@/components/products/OmnichannelInbox/ProductIntro";
import SocialProof from "@/components/products/OmnichannelInbox/SocialProof";
import UseCases from "@/components/products/OmnichannelInbox/UseCases";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://rateup.app/products/omnichannel-inbox#software",
      name: "RateUp Omnichannel Inbox",
      alternateName: "RateUp",
      url: "https://rateup.app/products/omnichannel-inbox",
      description:
        "RateUp is an omnichannel chat inbox that unifies WhatsApp, Instagram, and Messenger conversations in one workspace, helping teams automate support, track customer satisfaction, and improve response times.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Customer Service Software",
      operatingSystem: "Web, Android, iOS",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      softwareVersion: "2026",
      releaseNotes: "https://rateup.app/products/omnichannel-inbox",
      featureList: [
        "Unified inbox for WhatsApp, Instagram, and Messenger",
        "Team roles and permissions routing",
        "Inbox automations and quick replies",
        "Customer lifecycle stages tracking",
        "Real-time analytics and reporting",
        "CRM and helpdesk integrations",
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "412",
        bestRating: "5",
        worstRating: "1",
      },
      offers: [
        {
          "@type": "Offer",
          name: "Starter Plan",
          price: "0",
          priceCurrency: "INR",
          url: "https://rateup.app/pricing",
          availability: "https://schema.org/InStock",
        },
      ],
    },
    {
      "@type": "WebPage",
      "@id": "https://rateup.app/products/omnichannel-inbox#webpage",
      url: "https://rateup.app/products/omnichannel-inbox",
      name: "Omnichannel Marketing & Support Inbox Platform | RateUp",
      description:
        "Manage all your customer conversations in one unified inbox. Connect WhatsApp Business, Instagram, and Messenger. Stop juggling tabs and reply faster.",
      isPartOf: {
        "@type": "WebSite",
        "@id": "https://rateup.app#website",
        url: "https://rateup.app",
        name: "RateUp",
      },
      about: {
        "@id": "https://rateup.app/products/omnichannel-inbox#software",
      },
    },
  ],
};

export const Route = createFileRoute("/(marketing)/products/omnichannel-inbox/")({
  component: RouteComponent,
  head: () => ({
    ...buildPageHead("/products/omnichannel-inbox"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd),
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <Layout contentClassName={styles.themeOmnichannel}>
      <Hero />
      <SocialProof />
      <Problem />
      <ProductIntro />
      <Features />
      <Integrations />
      <HowItWorks />
      <UseCases />
      <Comparison />
      <CTABand />
    </Layout>
  );
}
