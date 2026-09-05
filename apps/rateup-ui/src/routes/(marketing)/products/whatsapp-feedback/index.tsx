import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import BusinessSection from "@/components/products/whatsapp-feedback/BusinessSection";
import CTASection from "@/components/products/whatsapp-feedback/CTASection";
import FAQSection from "@/components/products/whatsapp-feedback/FAQSection";
import Hero from "@/components/products/whatsapp-feedback/Hero";
import LogosBand from "@/components/products/whatsapp-feedback/LogosBand";
import ProblemSection from "@/components/products/whatsapp-feedback/ProblemSection";
import SolutionSection from "@/components/products/whatsapp-feedback/SolutionSection";
import StatsBand from "@/components/products/whatsapp-feedback/StatsBand";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

import style from "@/components/products/whatsapp-feedback/feedback.module.css";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://rateup.app/products/whatsapp-feedback#software",
      name: "RateUp WhatsApp Feedback & Surveys",
      alternateName: "RateUp",
      url: "https://rateup.app/products/whatsapp-feedback",
      description:
        "RateUp is a WhatsApp feedback and survey automation tool leveraging WhatsApp Flows to send native, interactive forms directly to customers, boosting response rates up to 35%.",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Survey & Feedback Software",
      operatingSystem: "Web, Android, iOS",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      softwareVersion: "2026",
      releaseNotes: "https://rateup.app/products/whatsapp-feedback",
      featureList: [
        "WhatsApp Flows native interactive surveys",
        "Automated post-purchase survey triggers",
        "NPS, CSAT, and custom feedback collection",
        "Automated customer sentiment analysis",
        "Integration with Shopify and WooCommerce",
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
      "@id": "https://rateup.app/products/whatsapp-feedback#webpage",
      url: "https://rateup.app/products/whatsapp-feedback",
      name: "WhatsApp Customer Feedback & Survey Automation Tool | RateUp",
      description:
        "Collect valuable customer feedback directly inside WhatsApp. Leverage interactive WhatsApp Flows to achieve up to 35% response rates. Start for free.",
      isPartOf: {
        "@type": "WebSite",
        "@id": "https://rateup.app#website",
        url: "https://rateup.app",
        name: "RateUp",
      },
      about: {
        "@id": "https://rateup.app/products/whatsapp-feedback#software",
      },
    },
  ],
};

export const Route = createFileRoute("/(marketing)/products/whatsapp-feedback/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: WhatsappFeedback,
  head: () => buildPageHead("/products/whatsapp-feedback", { jsonLd }),
});

function WhatsappFeedback() {
  useEffect(() => {
    const revObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(style.in);
            revObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    globalThis.document.querySelectorAll(`.${style.reveal}`).forEach((el) => revObs.observe(el));
    return () => revObs.disconnect();
  }, []);

  return (
    <Layout contentClassName={styles.themeFeedback}>
      <span id="top" />
      <Hero />
      <LogosBand />
      <ProblemSection />
      <StatsBand />
      <SolutionSection />
      <BusinessSection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
}
