import { createFileRoute } from "@tanstack/react-router";

import InboxPage from "@/components/products/landing/inbox";
import { INBOX_FAQS } from "@/components/products/landing/inbox/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/omnichannel-inbox";

const DESCRIPTION =
  "RateUp is an omnichannel chat inbox that unifies WhatsApp, Instagram, and Messenger conversations in one workspace. Teams assign conversations to agents and teams, add private notes, and close each one with a result.";

const FEATURES = [
  "Unified inbox for WhatsApp, Instagram, and Messenger",
  "Assignment to agents and teams",
  "Private notes and @mentions",
  "Inbox automations and quick replies",
  "WhatsApp 24-hour session countdown",
  "Customer lifecycle stages tracking",
  "Agent and team performance analytics",
  "Shopify, WooCommerce, Zapier and REST API integrations",
];

const jsonLd = productPage({
  path: PATH,
  name: "Omnichannel Inbox",
  title: "Omnichannel Inbox for WhatsApp, Instagram & Messenger",
  description: DESCRIPTION,
  subCategory: "Customer Service Software",
  featureList: FEATURES,
  faqs: INBOX_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/omnichannel-inbox/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "Omnichannel Inbox",
          path: PATH,
          summary: DESCRIPTION,
          features: FEATURES,
          faqs: INBOX_FAQS,
        }),
      ),
    ],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <InboxPage />
    </Layout>
  );
}
