import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ShopifyBulkDiscountGenerator from "@/components/HomePage/pages/Tools/ShopifyBulkDiscountGenerator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "shopify-bulk-discount-code-generator";

export const Route = createFileRoute("/(marketing)/tools/shopify-bulk-discount-code-generator/")({
  component: ShopifyBulkDiscountGeneratorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ShopifyBulkDiscountGeneratorPage() {
  const tool = getToolBySlug(SLUG);
  if (!tool) return null;

  return (
    <ToolsShell
      activeSlug={SLUG}
      title={tool.headline}
      description={tool.tagline}
      badge={tool.badge}
      crumb={{ label: tool.name }}
    >
      <ShopifyBulkDiscountGenerator />
    </ToolsShell>
  );
}
