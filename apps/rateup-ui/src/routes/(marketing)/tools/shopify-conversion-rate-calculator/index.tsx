import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ShopifyConversionRateCalculator from "@/components/HomePage/pages/Tools/ShopifyConversionRateCalculator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "shopify-conversion-rate-calculator";

export const Route = createFileRoute("/(marketing)/tools/shopify-conversion-rate-calculator/")({
  component: ShopifyConversionRateCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ShopifyConversionRateCalculatorPage() {
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
      <ShopifyConversionRateCalculator />
    </ToolsShell>
  );
}
