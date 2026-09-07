import { createFileRoute } from "@tanstack/react-router";

import NpsSurveyTemplates from "@/components/HomePage/pages/Tools/NpsSurveyTemplates/index.tsx";
import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "nps-survey-templates";

export const Route = createFileRoute("/(marketing)/tools/nps-survey-templates/")({
  component: NpsSurveyTemplatesPage,
  head: () => {
    const tool = getToolBySlug(SLUG);

    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function NpsSurveyTemplatesPage() {
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
      <NpsSurveyTemplates />
    </ToolsShell>
  );
}
