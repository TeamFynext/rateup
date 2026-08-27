import { createFileRoute } from "@tanstack/react-router";

import { getAllRateupPaymentPlans } from "@/backend/payment/payment.api";
import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import { buildFaqs, Faq } from "@/components/HomePage/pages/Pricing/FAQ.tsx";
import { PricingCta } from "@/components/HomePage/pages/Pricing/PricingCta.tsx";
import { PricingPlanReview } from "@/components/HomePage/pages/Pricing/PricingPlanReview.tsx";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection.tsx";
import { ClientLogoSectionNew } from "@/components/products/ReviewWithAiComponents/shared/ReviewTestimonials.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata";

import { buildPricingMarkdown } from "../../../markdown/pricing";
import { createMarkdownMiddleware } from "../../../markdown/serveMarkdown";

/**
 * The page's FAQ structured data, built from the very entries <Faq /> renders.
 *
 * Derived rather than duplicated: a search engine showing an answer that contradicts the
 * page is worse than having no rich result at all, and the conversation-pack answer
 * carries a price that comes from the catalog and can change without this file being
 * touched.
 */
function pricingFaqJsonLd(plans: RateupPaymentPlan[] | undefined) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: buildFaqs(plans).map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: Array.isArray(entry.answer) ? entry.answer.join("; ") : entry.answer,
      },
    })),
  };
}

export const Route = createFileRoute("/(marketing)/pricing/")({
  server: {
    middleware: [
      createMarkdownMiddleware(async () => {
        const plans = await getAllRateupPaymentPlans();
        return buildPricingMarkdown(plans);
      }),
    ],
  },
  component: Pricing,
  loader: getAllRateupPaymentPlans,
  head: ({ loaderData }) => ({
    ...buildPageHead("/pricing"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(pricingFaqJsonLd(loaderData)),
      },
    ],
  }),
});

function Pricing() {
  const plans = Route.useLoaderData();
  return (
    <Layout>
      <PricingSection plans={plans} />
      <ClientLogoSectionNew />

      <div
        className="grid xs:grid-cols-1 lg:grid-cols-2 p-0"
        style={{
          background: "linear-gradient(to bottom right, #00397b, #013553, #1c518e)",
        }}
      >
        <Faq plans={plans} />
        <PricingPlanReview />
      </div>

      <PricingCta />
    </Layout>
  );
}
