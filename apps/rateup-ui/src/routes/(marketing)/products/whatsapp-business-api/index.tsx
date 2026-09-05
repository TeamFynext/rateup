import { createFileRoute } from "@tanstack/react-router";

import BusinessApiPage from "@/components/products/landing/business-api";
import { BUSINESS_API_FAQS } from "@/components/products/landing/business-api/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/whatsapp-business-api";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp for the WhatsApp Business API",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp is an official Meta Business Solution Provider. It onboards businesses onto the WhatsApp Business API through Embedded Signup and provides the inbox, campaigns, automation, feedback and loyalty built on top of it.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "WhatsApp Business API Platform",
    operatingSystem: "Web, Android, iOS",
    featureList: [
      "WhatsApp Business API onboarding via Meta Embedded Signup",
      "Template editor across Marketing, Utility and Authentication categories",
      "Carousel templates, template sync and display-name change requests",
      "No-code Flows builder with 24 element types and branching logic",
      "In-chat catalog, cart and checkout",
      "WhatsApp native payment, UPI, cash on delivery, bank transfer and Shopify checkout links",
      "Shared inbox for WhatsApp, Instagram and Messenger with assignment and labels",
      "Automation triggers, chatbots and Meta's AI agent with knowledge and guardrails",
    ],
    publisher,
  },
  faqPage(BUSINESS_API_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "WhatsApp Business API", path: PATH },
  ]),
  webPage(
    PATH,
    "WhatsApp Business API for Growing Brands",
    "Get the WhatsApp Business API in minutes with Meta Embedded Signup: templates, Flows, catalog, payments, a shared inbox, loyalty and broadcasts in one platform.",
  ),
);

export const Route = createFileRoute("/(marketing)/products/whatsapp-business-api/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <BusinessApiPage />
    </Layout>
  );
}
