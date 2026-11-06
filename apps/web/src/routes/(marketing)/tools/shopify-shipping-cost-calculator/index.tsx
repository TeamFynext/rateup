import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ShopifyShippingCostCalculator from "@/components/HomePage/pages/Tools/ShopifyShippingCostCalculator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "shopify-shipping-cost-calculator";

export const Route = createFileRoute("/(marketing)/tools/shopify-shipping-cost-calculator/")({
  component: ShopifyShippingCostCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ShopifyShippingCostCalculatorPage() {
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
      <ShopifyShippingCostCalculator />
    </ToolsShell>
  );
}
