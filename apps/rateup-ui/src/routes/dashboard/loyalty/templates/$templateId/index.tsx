import { createFileRoute } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";
import { TemplateType } from "@/types/enums.ts";

export const Route = createFileRoute("/dashboard/loyalty/templates/$templateId/")({
  component: LoyaltyTemplateEditPage,
});

function LoyaltyTemplateEditPage() {
  // Always a LOYALTY template here, and saving lands back on Messages › Templates — the
  // library this editor belongs to, whether the reader arrived from there or from a card.
  return (
    <WhatsappTemplateById
      forceTemplateType={TemplateType.LOYALTY}
      backTo={{ to: LOYALTY_PATHS.messages, search: { tab: "templates" } }}
    />
  );
}
