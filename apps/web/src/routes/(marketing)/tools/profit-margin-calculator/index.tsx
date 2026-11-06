import { createFileRoute } from "@tanstack/react-router";

import ProfitMarginCalculator from "@/components/HomePage/pages/Tools/ProfitMarginCalculator/index.tsx";
import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "profit-margin-calculator";

export const Route = createFileRoute("/(marketing)/tools/profit-margin-calculator/")({
  component: ProfitMarginCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);
    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function ProfitMarginCalculatorPage() {
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
      <ProfitMarginCalculator />
    </ToolsShell>
  );
}
