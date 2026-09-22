import { createFileRoute } from "@tanstack/react-router";

import { EditRewardPage } from "@/components/dashboard/loyalty/rewards/RewardEditorPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/rewards/$rewardId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { rewardId } = Route.useParams();
  return <EditRewardPage rewardId={rewardId} />;
}
