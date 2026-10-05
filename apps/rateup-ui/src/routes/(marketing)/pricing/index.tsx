import { createFileRoute } from "@tanstack/react-router";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import { buildFaqs } from "@/components/HomePage/pages/Pricing/faq.data.ts";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection.tsx";
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
// Imported on demand: a route's non-component options land in the client entry, and the
// payment API brings axios with it.
async function loadPlans() {
  const { getAllRateupPaymentPlans } = await import("@/backend/payment/payment.api");
  return getAllRateupPaymentPlans();
}

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
    middleware: [createMarkdownMiddleware(async () => buildPricingMarkdown(await loadPlans()))],
  },
  component: Pricing,
  loader: loadPlans,
  head: ({ loaderData }) => buildPageHead("/pricing", { jsonLd: pricingFaqJsonLd(loaderData) }),
});

function Pricing() {
  const plans = Route.useLoaderData();
  return (
    <Layout>
      <PricingSection plans={plans} />
    </Layout>
  );
}
