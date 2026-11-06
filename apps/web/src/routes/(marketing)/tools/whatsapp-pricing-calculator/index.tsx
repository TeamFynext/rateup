import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import WhatsAppPricingCalculator from "@/components/HomePage/pages/Tools/WhatsAppPricingCalculator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "whatsapp-pricing-calculator";

export const Route = createFileRoute("/(marketing)/tools/whatsapp-pricing-calculator/")({
  component: WhatsAppPricingCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);

    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function WhatsAppPricingCalculatorPage() {
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
      <WhatsAppPricingCalculator />
    </ToolsShell>
  );
}
