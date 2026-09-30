import { createFileRoute } from "@tanstack/react-router";

import HubSpotIntegrationPage from "@/components/products/landing/hubspot";
import { HUBSPOT_FAQS } from "@/components/products/landing/hubspot/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { integrationsMarkdown } from "@/markdown/integrations";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/integrations/hubspot";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp for HubSpot",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp's HubSpot integration keeps contacts in step both ways, turns Leads board leads into HubSpot deals that move with them, and logs closed WhatsApp conversations and survey responses as notes on the contact.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM Integration",
    operatingSystem: "Web",
    featureList: [
      "Connect with HubSpot's own sign-in; one account per workspace",
      "Contacts synced both ways, matched by email then phone",
      "Leads board leads as HubSpot deals, with column-to-stage mapping both ways",
      "Optional import of contacts and deals created in HubSpot",
      "Closed WhatsApp conversations logged as notes, with the last 50 messages",
      "Survey responses logged as notes, question by question",
      "First-time sync of existing contacts and leads in both directions",
    ],
    publisher,
  },
  faqPage(HUBSPOT_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: "HubSpot", path: PATH },
  ]),
  webPage(
    PATH,
    "HubSpot WhatsApp Integration: Contacts, Deals & Conversations",
    "Connect HubSpot to WhatsApp: two-way contact sync, Leads board leads as deals, and closed conversations and survey responses logged on the contact.",
  ),
);

export const Route = createFileRoute("/(marketing)/integrations/hubspot/")({
  server: {
    middleware: [createMarkdownMiddleware(integrationsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <HubSpotIntegrationPage />
    </Layout>
  );
}
