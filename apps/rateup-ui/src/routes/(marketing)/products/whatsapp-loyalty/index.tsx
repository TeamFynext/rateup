import { createFileRoute } from "@tanstack/react-router";

import { buildPageHead } from "@/lib/metadata.ts";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";
import CustomerProfiles from "@/components/LoyaltyLandingPage/CustomerProfiles";
import Faq from "@/components/LoyaltyLandingPage/Faq";
import Hero from "@/components/LoyaltyLandingPage/Hero";
import HowItWorks from "@/components/LoyaltyLandingPage/HowItWorks";
import Integrations from "@/components/LoyaltyLandingPage/Integrations";
import Trusted from "@/components/LoyaltyLandingPage/Trusted";
import WhyWhatsApp from "@/components/LoyaltyLandingPage/WhyWhatsApp";
import Layout from "@/components/RateupHomePage/Layout";
import HomePageFooter from "@/components/RateupHomePage/shared/HomePageFooter";

import { productsMarkdown } from "../../../../markdown/products";
import { createMarkdownMiddleware } from "../../../../markdown/serveMarkdown";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://rateup.app/products/whatsapp-loyalty#software",
      name: "RateUp WhatsApp Loyalty Program",
      alternateName: "RateUp",
      url: "https://rateup.app/products/whatsapp-loyalty",
      description:
        "RateUp is a WhatsApp-based customer loyalty program software that lets businesses reward customers with points, run referral programs, and send automated campaigns — all without requiring customers to download an app.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Customer Loyalty Software",
      operatingSystem: "Web, Android, iOS",
      browserRequirements:
        "Requires a modern web browser with JavaScript enabled",
      softwareVersion: "2026",
      releaseNotes: "https://rateup.app/products/whatsapp-loyalty",

      featureList: [
        "WhatsApp-based loyalty and rewards program",
        "No app download required for customers",
        "Custom points earning and redemption rules",
        "Automated reward coupons and offers via WhatsApp",
        "Referral tracking and referral rewards",
        "WhatsApp broadcast campaigns",
        "QR code onboarding for customers",
        "Real-time analytics and ROI tracking",
        "Shopify and WooCommerce integration",
        "POS and CRM integrations",
        "Gamified rewards and custom milestones",
        "95% open rate via WhatsApp messaging",
      ],

      screenshot:
        "https://djd7kjh9uwow0.cloudfront.net/images/whatsapp-loyalty/HEADER IMAGE (1).jpg",

      offers: [
        {
          "@type": "Offer",
          name: "Starter Plan",
          price: "0",
          priceCurrency: "INR",
          description:
            "Single team with one user. Includes 5 web surveys, 1000 monthly responses, WhatsApp single flow, one automation, one campaign with 1000 monthly template messages.",
          url: "https://rateup.app/pricing",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Enterprise Plan",
          description:
            "Custom pricing for growing businesses. Contact sales for details.",
          url: "https://rateup.app/pricing",
          availability: "https://schema.org/InStock",
        },
      ],

      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "500",
        bestRating: "5",
        worstRating: "1",
      },

      review: [
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Shalini",
          },
          reviewBody:
            "This is the first loyalty program our customers actually use. It's seamless, and we saw a 60% increase in repeat visits.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
          },
          itemReviewed: {
            "@id": "https://rateup.app/products/whatsapp-loyalty#software",
          },
        },
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Ramesh",
          },
          reviewBody:
            "No more stamp cards! Our staff and customers both love how easy it is.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
          },
          itemReviewed: {
            "@id": "https://rateup.app/products/whatsapp-loyalty#software",
          },
        },
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Priya",
          },
          reviewBody:
            "We started seeing customers come back more frequently within just two weeks of using RateUp. The WhatsApp integration is genius.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
          },
          itemReviewed: {
            "@id": "https://rateup.app/products/whatsapp-loyalty#software",
          },
        },
      ],

      publisher: {
        "@type": "Organization",
        "@id": "https://rateup.app#organization",
        name: "RateUp",
        url: "https://rateup.app",
        logo: {
          "@type": "ImageObject",
          url: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
        },
        contactPoint: {
          "@type": "ContactPoint",
          url: "https://rateup.app/contact-us",
          contactType: "customer support",
        },
        sameAs: ["https://rateup.app"],
      },

      audience: {
        "@type": "Audience",
        audienceType: "Small and Medium Businesses",
        description:
          "Retail stores, salons, spas, cafes, restaurants, clinics, gyms, fitness studios, D2C and ecommerce brands",
      },
    },

    {
      "@type": "WebPage",
      "@id": "https://rateup.app/products/whatsapp-loyalty#webpage",
      url: "https://rateup.app/products/whatsapp-loyalty",
      name: "WhatsApp Loyalty Program Software for Small Businesses | RateUp",
      description:
        "Build a WhatsApp-based customer loyalty program in minutes. No app download required. Reward customers with points, run referrals, and send automated WhatsApp campaigns. Trusted by 500+ businesses.",
      isPartOf: {
        "@type": "WebSite",
        "@id": "https://rateup.app#website",
        url: "https://rateup.app",
        name: "RateUp",
      },
      about: {
        "@id": "https://rateup.app/products/whatsapp-loyalty#software",
      },
      publisher: {
        "@id": "https://rateup.app#organization",
      },
    },
  ],
};

export const Route = createFileRoute("/(marketing)/products/whatsapp-loyalty/")(
  {
    server: {
      middleware: [createMarkdownMiddleware(productsMarkdown)],
    },
    component: LoyaltyLandingPage,
    head: () => ({
      ...buildPageHead("/products/whatsapp-loyalty"),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    }),
  },
);

function LoyaltyLandingPage() {
  useRevealAnimation();
  return (
    <Layout navbarClassName="heroNav">
      <span id="top"></span>
      <Hero />
      <HowItWorks />
      <WhyWhatsApp />
      <CustomerProfiles />
      <Integrations />
      <Trusted />
      <Faq />
      <HomePageFooter />
    </Layout>
  );
}
