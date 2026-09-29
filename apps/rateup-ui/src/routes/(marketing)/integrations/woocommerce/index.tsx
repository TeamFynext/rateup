import { createFileRoute } from "@tanstack/react-router";

import WooCommerceIntegrationPage from "@/components/products/landing/woocommerce";
import { WOO_FAQS } from "@/components/products/landing/woocommerce/content";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { breadcrumbList, faqPage, graph, publisher, webPage } from "@/lib/jsonLd.ts";
import { BASE_URL, buildPageHead } from "@/lib/metadata.ts";
import { integrationsMarkdown } from "@/markdown/integrations";
import { createMarkdownMiddleware } from "@/markdown/serveMarkdown";

const PATH = "/integrations/woocommerce";

const jsonLd = graph(
  {
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}${PATH}#software`,
    name: "RateUp for WooCommerce",
    url: `${BASE_URL}${PATH}`,
    description:
      "RateUp's WooCommerce integration turns order status changes into WhatsApp messages, awards loyalty points on completed orders, makes rewards into one-use checkout coupons, and keeps a WhatsApp catalog in step with the store.",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Ecommerce Marketing Integration",
    operatingSystem: "Web",
    featureList: [
      "Connect with the store address and WooCommerce's own approval screen — no plugin",
      "Store webhooks registered automatically",
      "WhatsApp messages on processing, completed, on-hold, cancelled, refunded and failed orders",
      "Order fields mappable into approved template variables",
      "Loyalty points on completed orders, taken back on refund or cancellation",
      "Loyalty rewards as one-use WooCommerce coupons",
      "New customers added as contacts",
      "Products imported into the WhatsApp catalog and kept up to date",
    ],
    publisher,
  },
  faqPage(WOO_FAQS),
  breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Integrations", path: "/integrations" },
    { name: "WooCommerce", path: PATH },
  ]),
  webPage(
    PATH,
    "WooCommerce WhatsApp Integration: Orders, Loyalty & Coupons",
    "Connect WooCommerce to WhatsApp: order status messages, loyalty points on completed orders, rewards as checkout coupons and a WhatsApp catalog that follows your store.",
  ),
);

export const Route = createFileRoute("/(marketing)/integrations/woocommerce/")({
  server: {
    middleware: [createMarkdownMiddleware(integrationsMarkdown)],
  },
  component: RouteComponent,
  head: () => buildPageHead(PATH, { jsonLd }),
});

function RouteComponent() {
  return (
    <Layout>
      <WooCommerceIntegrationPage />
    </Layout>
  );
}
