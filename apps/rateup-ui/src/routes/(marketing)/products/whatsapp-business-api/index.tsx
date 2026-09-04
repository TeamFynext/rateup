import { createFileRoute } from "@tanstack/react-router";

import BusinessApiPage, { BUSINESS_API_FAQS } from "@/components/products/landing/BusinessApiPage";
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
      "Shared team inbox for WhatsApp, Instagram and Messenger",
      "Message template drafting and approval tracking",
      "Broadcast campaigns with segmentation and analytics",
      "No-code chat automation and chatbots",
      "WhatsApp Flows for native in-chat forms",
      "Loyalty programs and feedback collection on WhatsApp",
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
    "WhatsApp Business API for Business — Official Meta Partner",
    "What the WhatsApp Business API is, how it differs from the WhatsApp Business app, how Embedded Signup onboarding works, what Meta charges per message, and what businesses build on it.",
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
