import { createFileRoute } from "@tanstack/react-router";

import RtoLossCalculator from "@/components/HomePage/pages/Tools/RtoLossCalculator/index.tsx";
import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "rto-loss-calculator";

export const Route = createFileRoute("/(marketing)/tools/rto-loss-calculator/")({
  component: RtoLossCalculatorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);

    return {
      ...buildPageHead(`/tools/${SLUG}`),
      ...(tool
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify(buildToolJsonLd(tool)),
              },
            ],
          }
        : {}),
    };
  },
});

function RtoLossCalculatorPage() {
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
      <RtoLossCalculator />
    </ToolsShell>
  );
}
