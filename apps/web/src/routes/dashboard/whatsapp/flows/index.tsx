import { createFileRoute } from "@tanstack/react-router";

import { FlowsPage } from "@/components/dashboard/whatsapp/flows/FlowsPage.tsx";
import { oneOf, optionalString } from "@/utils/search.ts";

// `?action=create` opens the create-flow wizard on arrival (Loyalty → Feedback links here),
// and `?for=` preselects the purpose so a caller that already knows what it wants — Loyalty →
// Feedback wants LOYALTY_FEEDBACK — does not make the user find it in the grid.
export const Route = createFileRoute("/dashboard/whatsapp/flows/")({
  validateSearch: (search: Record<string, unknown>): { action?: "create"; for?: string } => ({
    action: oneOf(["create"], search.action),
    for: optionalString(search.for),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <FlowsPage />;
}
