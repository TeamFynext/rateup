import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Flow } from "@/components/dashboard/whatsapp/flows/v2/Flow.tsx";

// `?tab=` values are FlowTabEnum (FlowPageHeader); declared here so links from elsewhere
// (Loyalty › Feedback opens the Responses tab) type-check. Flow.tsx reads it loosely.
const searchSchema = z.object({
  tab: z
    .enum(["Edit", "Settings", "Share", "Responses", "Analytics", "Team Analytics"])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/dashboard/whatsapp/flows/v2/$dbFlowId/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <Flow />;
}
