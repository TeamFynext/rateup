import { createFileRoute } from "@tanstack/react-router";

import MetaAiAgentPage from "@/components/products/landing/meta-ai-agent";
import {
  AGENT_DESCRIPTION,
  AGENT_FAQS,
  AGENT_FEATURES,
} from "@/components/products/landing/meta-ai-agent/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/meta-ai-agent";

const jsonLd = productPage({
  path: PATH,
  name: "Meta AI Agent",
  title: "Meta AI Agent for WhatsApp Business",
  description: AGENT_DESCRIPTION,
  subCategory: "Customer Service Software",
  featureList: AGENT_FEATURES,
  faqs: AGENT_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/meta-ai-agent/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "Meta AI Agent",
          path: PATH,
          summary: AGENT_DESCRIPTION,
          features: AGENT_FEATURES,
          faqs: AGENT_FAQS,
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
      <MetaAiAgentPage />
    </Layout>
  );
}
