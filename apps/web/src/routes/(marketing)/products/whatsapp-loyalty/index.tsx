import { createFileRoute } from "@tanstack/react-router";

import LoyaltyPage from "@/components/products/landing/loyalty";
import {
  LOYALTY_DESCRIPTION,
  LOYALTY_FAQS,
  LOYALTY_FEATURES,
} from "@/components/products/landing/loyalty/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/whatsapp-loyalty";

const jsonLd = productPage({
  path: PATH,
  name: "WhatsApp Loyalty",
  title: "WhatsApp Loyalty Program Software",
  description: LOYALTY_DESCRIPTION,
  subCategory: "Loyalty Program Software",
  featureList: LOYALTY_FEATURES,
  faqs: LOYALTY_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/whatsapp-loyalty/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "WhatsApp Loyalty",
          path: PATH,
          summary: LOYALTY_DESCRIPTION,
          features: LOYALTY_FEATURES,
          faqs: LOYALTY_FAQS,
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
      <LoyaltyPage />
    </Layout>
  );
}
