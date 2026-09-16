import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FlowsPage } from "@/components/dashboard/whatsapp/flows/FlowsPage.tsx";

// `?action=create` opens the create-flow wizard on arrival (Loyalty → Feedback links here),
// and `?for=` preselects the purpose so a caller that already knows what it wants — Loyalty →
// Feedback wants LOYALTY_FEEDBACK — does not make the user find it in the grid.
const searchSchema = z.object({
  action: z.enum(["create"]).optional().catch(undefined),
  for: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/whatsapp/flows/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <FlowsPage />;
}
