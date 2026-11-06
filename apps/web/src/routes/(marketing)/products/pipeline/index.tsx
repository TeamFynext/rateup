import { createFileRoute } from "@tanstack/react-router";

import PipelinePage from "@/components/products/landing/pipeline";
import {
  PIPELINE_DESCRIPTION,
  PIPELINE_FAQS,
  PIPELINE_FEATURES,
} from "@/components/products/landing/pipeline/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/pipeline";

const jsonLd = productPage({
  path: PATH,
  name: "Pipeline",
  title: "WhatsApp CRM Pipeline for Leads & Support",
  description: PIPELINE_DESCRIPTION,
  subCategory: "Customer Relationship Management Software",
  featureList: PIPELINE_FEATURES,
  faqs: PIPELINE_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/pipeline/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "Pipeline",
          path: PATH,
          summary: PIPELINE_DESCRIPTION,
          features: PIPELINE_FEATURES,
          faqs: PIPELINE_FAQS,
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
      <PipelinePage />
    </Layout>
  );
}
