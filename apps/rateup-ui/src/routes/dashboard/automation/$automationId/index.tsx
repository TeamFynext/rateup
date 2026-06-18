"use client";

import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";

import WhatsappAutomationRuleBuilder from "../../../../components/dashboard/automation/components/WhatsappAutomationRuleBuilder.tsx";

export const Route = createFileRoute("/dashboard/automation/$automationId/")({
  component: Page,
});

function Page() {
  const params = useParams({
    strict: false,
  });
  const searchParams = useSearch({
    from: Route.id,
  });
  const automationId = params.automationId!;

  return (
    <WhatsappAutomationRuleBuilder
      ruleId={automationId}
      initialPlatform={searchParams.platform}
      initialTriggerEvent={searchParams.triggerEvent}
    />
  );
}
