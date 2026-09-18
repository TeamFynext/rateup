import { createFileRoute } from "@tanstack/react-router";

import InboxPage from "@/components/products/landing/inbox";
import { INBOX_FAQS } from "@/components/products/landing/inbox/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { faqPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";

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
        "RateUp is an omnichannel chat inbox that unifies WhatsApp, Instagram, and Messenger conversations in one workspace. Teams assign conversations to agents and teams, add private notes, and close each one with a result.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Customer Service Software",
      operatingSystem: "Web, Android, iOS",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      softwareVersion: "2026",
      releaseNotes: "https://rateup.app/products/omnichannel-inbox",
      featureList: [
        "Unified inbox for WhatsApp, Instagram, and Messenger",
        "Assignment to agents and teams",
        "Private notes and @mentions",
        "Inbox automations and quick replies",
        "WhatsApp 24-hour session countdown",
        "Customer lifecycle stages tracking",
        "Agent and team performance analytics",
        "Shopify, WooCommerce, Zapier and REST API integrations",
      ],
      // aggregateRating removed: Google's review-snippet policy requires the reviews to be
      // visible on the page itself. Re-add it only alongside real, rendered reviews.
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

    /* Built from the same array the page's accordion renders. */
    faqPage(INBOX_FAQS),
  ],
};

export const Route = createFileRoute("/(marketing)/products/omnichannel-inbox/")({
  component: RouteComponent,
  head: () => buildPageHead("/products/omnichannel-inbox", { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <InboxPage />
    </Layout>
  );
}
