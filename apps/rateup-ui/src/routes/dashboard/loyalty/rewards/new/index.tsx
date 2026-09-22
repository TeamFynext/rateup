import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NewRewardPage } from "@/components/dashboard/loyalty/rewards/RewardEditorPage.tsx";

const searchSchema = z.object({
  type: z.enum(["point", "coupon", "assigned"]).catch("point"),
});

export const Route = createFileRoute("/dashboard/loyalty/rewards/new/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { type } = Route.useSearch();
  // Keyed so switching type from a link on this page starts a fresh form.
  return <NewRewardPage key={type} type={type} />;
}
