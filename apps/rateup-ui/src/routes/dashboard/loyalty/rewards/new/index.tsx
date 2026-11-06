import { createFileRoute } from "@tanstack/react-router";

import { NewRewardPage } from "@/components/dashboard/loyalty/rewards/RewardEditorPage.tsx";
import { oneOf } from "@/utils/search.ts";

const REWARD_TYPES = ["point", "coupon", "assigned"] as const;

export const Route = createFileRoute("/dashboard/loyalty/rewards/new/")({
  validateSearch: (search: Record<string, unknown>): { type: (typeof REWARD_TYPES)[number] } => ({
    type: oneOf(REWARD_TYPES, search.type) ?? "point",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { type } = Route.useSearch();
  // Keyed so switching type from a link on this page starts a fresh form.
  return <NewRewardPage key={type} type={type} />;
}
