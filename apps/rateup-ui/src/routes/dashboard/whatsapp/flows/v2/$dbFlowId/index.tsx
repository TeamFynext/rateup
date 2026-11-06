import { createFileRoute } from "@tanstack/react-router";

import { Flow } from "@/components/dashboard/whatsapp/flows/v2/Flow.tsx";
import { oneOf } from "@/utils/search.ts";

// `?tab=` values are FlowTabEnum (FlowPageHeader); declared here so links from elsewhere
// (Loyalty › Feedback opens the Responses tab) type-check. Flow.tsx reads it loosely.
const FLOW_TABS = [
  "Edit",
  "Settings",
  "Share",
  "Responses",
  "Analytics",
  "Team Analytics",
] as const;

export const Route = createFileRoute("/dashboard/whatsapp/flows/v2/$dbFlowId/")({
  validateSearch: (search: Record<string, unknown>): { tab?: (typeof FLOW_TABS)[number] } => ({
    tab: oneOf(FLOW_TABS, search.tab),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <Flow />;
}
