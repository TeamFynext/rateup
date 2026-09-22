import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/share-qr")({
  component: () => <ComingSoon title="Share QR" description="Generate shareable QR codes." />,
});
