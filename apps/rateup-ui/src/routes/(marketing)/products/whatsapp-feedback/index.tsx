import { createFileRoute } from "@tanstack/react-router";

import FeedbackPage from "@/components/products/landing/feedback";
import {
  FEEDBACK_DESCRIPTION,
  FEEDBACK_FAQS,
  FEEDBACK_FEATURES,
} from "@/components/products/landing/feedback/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/whatsapp-feedback";

const jsonLd = productPage({
  path: PATH,
  name: "WhatsApp Feedback",
  title: "WhatsApp Customer Feedback, Right After the Visit",
  description: FEEDBACK_DESCRIPTION,
  subCategory: "Survey & Feedback Software",
  featureList: FEEDBACK_FEATURES,
  faqs: FEEDBACK_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/whatsapp-feedback/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "WhatsApp Feedback",
          path: PATH,
          summary: FEEDBACK_DESCRIPTION,
          features: FEEDBACK_FEATURES,
          faqs: FEEDBACK_FAQS,
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
      <FeedbackPage />
    </Layout>
  );
}
