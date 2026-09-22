import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/shopify")({
  component: () => <ComingSoon title="Shopify stores" description="Connected Shopify stores." />,
});
