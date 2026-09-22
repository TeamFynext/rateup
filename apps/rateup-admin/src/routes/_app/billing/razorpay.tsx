import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/billing/razorpay")({
  component: () => <ComingSoon title="Razorpay" description="Razorpay plans and subscriptions." />,
});
