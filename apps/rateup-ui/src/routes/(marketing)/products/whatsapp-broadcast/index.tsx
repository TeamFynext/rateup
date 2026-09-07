import { createFileRoute } from "@tanstack/react-router";

import BroadcastPage from "@/components/products/landing/broadcast";
import { BROADCAST_FAQS } from "@/components/products/landing/broadcast/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { productsMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/whatsapp-broadcast";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp WhatsApp Broadcast",
    url: `${BASE_URL}${PATH}`,
    description:
      "WhatsApp broadcast software built on Meta's official WhatsApp Business API: contact groups and status re-targeting, approved message templates with per-contact variables, scheduling with daily send limits and drip stages, and a per-campaign delivery report.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Campaign Software",
    operatingSystem: "Web, Android, iOS",
    featureList: [
      "Unlimited-recipient WhatsApp broadcasts on the official Business API",
      "Contact groups, CSV/XLSX import and re-targeting by message status",
      "Per-campaign consent gate",
      "Meta-approved templates with per-contact variable mapping",
      "Send now, schedule later, or drip across multiple stages",
      "Daily send limits that spread a campaign across days",
      "Delivery report with sent, delivered, read, pending and failed",
      "Resend to failed or pending contacts, and Excel/ODS export",
      "Preflight check against the plan's conversation allowance",
    ],
    publisher,
  },
  faqPage(BROADCAST_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products/whatsapp-business-api" },
    { name: "WhatsApp Broadcast", path: PATH },
  ]),
  webPage(
    PATH,
    "WhatsApp Broadcast Software on the Official API",
    "Send WhatsApp broadcasts to thousands of customers with approved templates, daily send limits and delivery reports, on the official WhatsApp Business API.",
  ),
);

export const Route = createFileRoute("/(marketing)/products/whatsapp-broadcast/")({
  server: {
    middleware: [createMarkdownMiddleware(productsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <BroadcastPage />
    </Layout>
  );
}
