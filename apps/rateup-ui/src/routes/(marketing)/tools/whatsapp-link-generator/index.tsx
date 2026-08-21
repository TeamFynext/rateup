import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import WhatsAppLinkGenerator from "@/components/HomePage/pages/Tools/WhatsAppLinkGenerator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "whatsapp-link-generator";

export const Route = createFileRoute("/(marketing)/tools/whatsapp-link-generator/")({
  component: WhatsAppLinkGeneratorPage,
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

function WhatsAppLinkGeneratorPage() {
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
      <WhatsAppLinkGenerator />
    </ToolsShell>
  );
}
