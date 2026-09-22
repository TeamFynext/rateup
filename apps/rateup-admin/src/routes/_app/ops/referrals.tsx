import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/referrals")({
  component: () => <ComingSoon title="Referrals" description="Referral partners and codes." />,
});
