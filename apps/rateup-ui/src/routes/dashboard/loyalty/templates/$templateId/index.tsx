import { createFileRoute } from "@tanstack/react-router";

import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";
import { TemplateType } from "@/types/enums.ts";

export const Route = createFileRoute("/dashboard/loyalty/templates/$templateId/")({
  component: LoyaltyTemplateEditPage,
});

function LoyaltyTemplateEditPage(_props) {
  // Patch the WhatsappTemplateById to always set templateType to LOYALTY on create
  return <WhatsappTemplateById forceTemplateType={TemplateType.LOYALTY} />;
}
