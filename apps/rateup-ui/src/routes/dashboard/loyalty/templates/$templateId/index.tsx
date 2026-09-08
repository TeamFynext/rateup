import { createFileRoute } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";
import { TemplateType } from "@/types/enums.ts";

export const Route = createFileRoute("/dashboard/loyalty/templates/$templateId/")({
  component: LoyaltyTemplateEditPage,
});

function LoyaltyTemplateEditPage() {
  // Always a LOYALTY template here, and saving lands back on Messages, not the WhatsApp list.
  return (
    <WhatsappTemplateById
      forceTemplateType={TemplateType.LOYALTY}
      backTo={LOYALTY_PATHS.messages}
    />
  );
}
