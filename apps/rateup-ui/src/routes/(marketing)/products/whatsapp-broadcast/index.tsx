import { createFileRoute } from "@tanstack/react-router";

import BroadcastPage from "@/components/products/landing/broadcast";
import {
  BROADCAST_DESCRIPTION,
  BROADCAST_FAQS,
  BROADCAST_FEATURES,
} from "@/components/products/landing/broadcast/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { productPage } from "@/lib/jsonLd.ts";
import { buildPageHead } from "@/lib/metadata.ts";
import { productMarkdown } from "@/markdown/products";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/products/whatsapp-broadcast";

const jsonLd = productPage({
  path: PATH,
  name: "WhatsApp Broadcast",
  title: "WhatsApp Broadcast Software on the Official API",
  description: BROADCAST_DESCRIPTION,
  subCategory: "Marketing Campaign Software",
  featureList: BROADCAST_FEATURES,
  faqs: BROADCAST_FAQS,
});

export const Route = createFileRoute("/(marketing)/products/whatsapp-broadcast/")({
  server: {
    middleware: [
      createMarkdownMiddleware(
        productMarkdown({
          name: "WhatsApp Broadcast",
          path: PATH,
          summary: BROADCAST_DESCRIPTION,
          features: BROADCAST_FEATURES,
          faqs: BROADCAST_FAQS,
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
      <BroadcastPage />
    </Layout>
  );
}
