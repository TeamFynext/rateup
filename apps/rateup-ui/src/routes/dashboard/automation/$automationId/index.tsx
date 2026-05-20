"use client";

import { createFileRoute, useParams } from "@tanstack/react-router";

import WhatsappAutomationRuleBuilder from "../../../../components/dashboard/automation/components/WhatsappAutomationRuleBuilder.tsx";

export const Route = createFileRoute("/dashboard/automation/$automationId/")({
  component: Page,
});

function Page() {
  const params = useParams({
    strict: false,
  });
  const automationId = params.automationId as string;

  return <WhatsappAutomationRuleBuilder ruleId={automationId} />;
}
