import { createFileRoute } from "@tanstack/react-router";

import ToolsShell from "@/components/HomePage/pages/Tools/shared/ToolsShell.tsx";
import ToolsIndex from "@/components/HomePage/pages/Tools/ToolsIndex/index.tsx";
import { buildToolsIndexJsonLd } from "@/config/tools.ts";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/tools/")({
  component: ToolsIndexPage,
  head: () => ({
    ...buildPageHead("/tools"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildToolsIndexJsonLd()),
      },
    ],
  }),
});

function ToolsIndexPage() {
  return (
    <ToolsShell
      title="Tools for WhatsApp and customer engagement"
      description="Calculators and generators we built for our own customers, opened up for everyone. No signup, no email wall — every one of them runs in your browser."
    >
      <ToolsIndex />
    </ToolsShell>
  );
}
