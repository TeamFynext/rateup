"use client";

import { createFileRoute } from "@tanstack/react-router";

import { WhatsappTemplateById } from "@/components/whatsapp/templates/WhatsappTemplateById.tsx";

export const Route = createFileRoute(
  "/dashboard/whatsapp/templates/$templateId/",
)({
  component: WhatsappTemplateById,
});
