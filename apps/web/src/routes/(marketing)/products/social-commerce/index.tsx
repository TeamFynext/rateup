import { createFileRoute } from "@tanstack/react-router";

import SocialCommercePage from "@/components/products/landing/social-commerce";
import {
  COMMERCE_DESCRIPTION,
  COMMERCE_FAQS,
  COMMERCE_FEATURES,
} from "@/components/products/landing/social-commerce/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/social-commerce";

const jsonLd = productPage({
  path: PATH,
  name: "Social Commerce",
  title: "Sell and Take Payments on WhatsApp, Instagram & Messenger",
  description: COMMERCE_DESCRIPTION,
  subCategory: "E-Commerce Software",
  featureList: COMMERCE_FEATURES,
  faqs: COMMERCE_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/social-commerce/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "Social Commerce",
          path: PATH,
          summary: COMMERCE_DESCRIPTION,
          features: COMMERCE_FEATURES,
          faqs: COMMERCE_FAQS,
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
      <SocialCommercePage />
    </Layout>
  );
}
