import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ShopifyProfitCalculator from "@/components/HomePage/pages/Tools/ShopifyProfitCalculator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "shopify-profit-calculator";

export const Route = createFileRoute("/(marketing)/tools/shopify-profit-calculator/")({
  component: ShopifyProfitCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ShopifyProfitCalculatorPage() {
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
      <ShopifyProfitCalculator />
    </ToolsShell>
  );
}
