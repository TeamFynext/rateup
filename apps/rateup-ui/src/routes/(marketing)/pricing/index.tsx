import { createFileRoute } from "@tanstack/react-router";

import { getAllRateupPaymentPlans } from "@/backend/payment/payment.api";
import { Faq } from "@/components/HomePage/pages/Pricing/FAQ.tsx";
import { PricingPlanReview } from "@/components/HomePage/pages/Pricing/PricingPlanReview.tsx";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection.tsx";
import { ClientLogoSectionNew } from "@/components/products/ReviewWithAiComponents/shared/ReviewTestimonials.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";

import { buildPricingMarkdown } from "../../../markdown/pricing";
import { createMarkdownMiddleware } from "../../../markdown/serveMarkdown";

const pricingFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do you offer a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely! We provide a 14-day free trial for all the plans so you can explore all features before committing. We will be billed after the trial period unless cancelled. Additionally we have a starter plan absolutely for free.",
      },
    },
    {
      "@type": "Question",
      name: "Which plan do you recommend for my business?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Starter → testing & very small usage; Basic → small businesses just starting with WhatsApp engagement; Pro → growing teams needing automation and advanced insights; Enterprise → large businesses requiring high volumes and customization.",
      },
    },
    {
      "@type": "Question",
      name: "Can I switch plans later?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can upgrade, downgrade, or move to a custom enterprise setup anytime. Changes apply instantly.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Major credit/debit cards/UPI/eMandate are supported. Enterprise customers can request invoicing and bank transfers. UPI and eMandate are available for customers from India only.",
      },
    },
  ],
};

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
  head: () => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(pricingFaqJsonLd),
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
          background:
            "linear-gradient(to bottom right, #00397b, #013553, #1c518e)",
        }}
      >
        <Faq />
        <PricingPlanReview />
      </div>
      <HomePageFooter />
    </Layout>
  );
}
