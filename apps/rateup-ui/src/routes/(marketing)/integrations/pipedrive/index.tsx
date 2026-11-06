import { createFileRoute } from "@tanstack/react-router";

import PipedriveIntegrationPage from "@/components/products/landing/pipedrive";
import { PIPEDRIVE_FAQS } from "@/components/products/landing/pipedrive/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { integrationsMarkdown } from "@/markdown/integrations";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/integrations/pipedrive";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp for Pipedrive",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp's Pipedrive integration keeps contacts and persons in step both ways, turns Leads board leads into Pipedrive deals that move, win and lose with them, and logs closed WhatsApp conversations and survey responses as notes on the person.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM Integration",
    operatingSystem: "Web",
    featureList: [
      "Connect with Pipedrive's own sign-in; one company per workspace",
      "Contacts and persons synced both ways, matched by email then phone",
      "Leads board leads as Pipedrive deals, with column-to-stage mapping both ways",
      "Won and Lost columns as the deal's status, with the lost reason",
      "Optional import of persons and deals created in Pipedrive",
      "Closed WhatsApp conversations logged as notes, with the last 50 messages",
      "Survey responses logged as notes, question by question",
      "First-time sync of existing contacts and leads in both directions",
    ],
    publisher,
  },
  faqPage(PIPEDRIVE_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: "Pipedrive", path: PATH },
  ]),
  webPage(
    PATH,
    "Pipedrive WhatsApp Integration: Contacts, Deals & Conversations",
    "Connect Pipedrive to WhatsApp: two-way person sync, Leads board leads as deals that win and lose with them, and closed conversations and survey responses logged on the person.",
  ),
);

export const Route = createFileRoute("/(marketing)/integrations/pipedrive/")({
  server: {
    middleware: [createMarkdownMiddleware(integrationsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <PipedriveIntegrationPage />
    </Layout>
  );
}
