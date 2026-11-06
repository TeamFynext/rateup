import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ShopifyFeeCalculator from "@/components/HomePage/pages/Tools/ShopifyFeeCalculator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "shopify-fee-calculator";

export const Route = createFileRoute("/(marketing)/tools/shopify-fee-calculator/")({
  component: ShopifyFeeCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ShopifyFeeCalculatorPage() {
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
      <ShopifyFeeCalculator />
    </ToolsShell>
  );
}
