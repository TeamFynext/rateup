import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";

import type { Platform } from "@/components/dashboard/automation/components/schema.ts";
import { PLATFORMS } from "@/components/dashboard/automation/components/schema.ts";

import WhatsappAutomationRuleBuilder from "../../../../components/dashboard/automation/components/WhatsappAutomationRuleBuilder.tsx";

/** The rule builder's `platform`, narrowed from the URL's query string. */
const toPlatform = (value: unknown): Platform | undefined =>
  PLATFORMS.map((option) => option.value).find((platform) => platform === value);

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
      initialPlatform={toPlatform(searchParams.platform)}
      initialTriggerEvent={
        typeof searchParams.triggerEvent === "string" ? searchParams.triggerEvent : undefined
      }
      initialChannelId={typeof searchParams.channel === "string" ? searchParams.channel : undefined}
    />
  );
}
