"use client";

import { createFileRoute } from "@tanstack/react-router";

import { TemplateType } from "@/types/enums.ts";
import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";

export const Route = createFileRoute(
  "/dashboard/loyalty/templates/$templateId/",
)({
  component: LoyaltyTemplateEditPage,
});

function LoyaltyTemplateEditPage(props) {
  // Patch the WhatsappTemplateById to always set templateType to LOYALTY on create
  return <WhatsappTemplateById forceTemplateType={TemplateType.LOYALTY} />;
}
