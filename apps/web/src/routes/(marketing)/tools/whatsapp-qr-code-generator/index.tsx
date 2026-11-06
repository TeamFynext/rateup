import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import WhatsAppQrGenerator from "@/components/HomePage/pages/Tools/WhatsAppQrGenerator/index.tsx";
import { buildToolJsonLd, getToolBySlug } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

const SLUG = "whatsapp-qr-code-generator";

export const Route = createFileRoute("/(marketing)/tools/whatsapp-qr-code-generator/")({
  component: WhatsAppQrGeneratorPage,
  head: () => {
    const tool = getToolBySlug(SLUG);

    return buildPageHead(`/tools/${SLUG}`, tool ? { jsonLd: buildToolJsonLd(tool) } : undefined);
  },
});

function WhatsAppQrGeneratorPage() {
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
      <WhatsAppQrGenerator />
    </ToolsShell>
  );
}
