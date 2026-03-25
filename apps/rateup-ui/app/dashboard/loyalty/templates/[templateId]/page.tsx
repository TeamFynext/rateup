"use client";

import React from "react";

import { TemplateType } from "@/types/enums";
import { WhatsappTemplateById as BaseWhatsappTemplateById } from "@/app/dashboard/whatsapp/templates/[templateId]/page";

// Wrapper to force templateType to LOYALTY on create
export default function LoyaltyTemplateEditPage(props) {
  // Patch the WhatsappTemplateById to always set templateType to LOYALTY on create
  return <BaseWhatsappTemplateById forceTemplateType={TemplateType.LOYALTY} />;
}
