import { createFileRoute } from "@tanstack/react-router";

import CustomerProfiles from "@/components/LoyaltyLandingPage/CustomerProfiles";
import Faq, { faqs } from "@/components/LoyaltyLandingPage/Faq";
import Hero from "@/components/LoyaltyLandingPage/Hero";
import HowItWorks from "@/components/LoyaltyLandingPage/HowItWorks";
import Integrations from "@/components/LoyaltyLandingPage/Integrations";
import Trusted from "@/components/LoyaltyLandingPage/Trusted";
import WhyWhatsApp from "@/components/LoyaltyLandingPage/WhyWhatsApp";
import Layout from "@/components/RateupHomePage/Layout";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";
import { faqPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { rateupLogoOg } from "@/utils/constants.ts";

import { productsMarkdown } from "../../../../markdown/products";
import { createMarkdownMiddleware } from "../../../../markdown/serveMarkdown";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

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
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
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
          description: "Custom pricing for growing businesses. Contact sales for details.",
          url: "https://rateup.app/pricing",
          availability: "https://schema.org/InStock",
        },
      ],

      // aggregateRating removed: Google's review-snippet policy requires the reviews to be
      // visible on the page itself. Re-add it only alongside real, rendered reviews.

      // The `review` array went with the aggregateRating, and for the same reason: it named
      // three people and their 5-star ratings, none of which appear anywhere on the page.
      // Google's review-snippet policy requires the reviews to be visible to the reader.

      publisher: {
        "@type": "Organization",
        "@id": "https://rateup.app#organization",
        name: "RateUp",
        url: "https://rateup.app",
        logo: {
          "@type": "ImageObject",
          url: rateupLogoOg,
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

    /* Built from the same `faqs` array `<Faq />` renders below. */
    faqPage(faqs.map((faq) => ({ question: faq.q, answer: faq.a }))),
  ],
};

export const Route = createFileRoute("/(marketing)/products/whatsapp-loyalty/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: LoyaltyLandingPage,
  head: () => buildPageHead("/products/whatsapp-loyalty", { jsonLd }),
});

function LoyaltyLandingPage() {
  useRevealAnimation();
  return (
    <Layout contentClassName={styles.themeLoyalty} navbarClassName="heroNav">
      <div className="loyalty-scope">
        <span id="top"></span>
        <Hero />
        <HowItWorks />
        <WhyWhatsApp />
        <CustomerProfiles />
        <Integrations />
        <Trusted />
        <Faq />
      </div>
    </Layout>
  );
}
