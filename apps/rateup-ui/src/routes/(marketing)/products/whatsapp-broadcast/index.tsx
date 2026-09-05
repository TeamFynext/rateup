import { createFileRoute } from "@tanstack/react-router";

import BroadcastPage, { BROADCAST_FAQS } from "@/components/products/landing/BroadcastPage";
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
      "WhatsApp broadcast software built on Meta's official WhatsApp Business API: segmented audiences, approved message templates, scheduling, opt-out compliance and per-campaign delivery analytics.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Campaign Software",
    operatingSystem: "Web, Android, iOS",
    featureList: [
      "Segmented WhatsApp broadcasts on the official Business API",
      "Meta message template drafting and approval tracking",
      "Campaign scheduling and staggered delivery",
      "Opt-in capture and automatic STOP opt-out handling",
      "Delivery, read, reply and click analytics per campaign",
      "Per-message cost estimates at Meta's published rates",
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
    "WhatsApp Broadcast Software on the Official Business API",
    "Send segmented WhatsApp broadcasts to thousands of customers on Meta's official API, with approved templates, scheduling, opt-out handling and delivery analytics.",
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
