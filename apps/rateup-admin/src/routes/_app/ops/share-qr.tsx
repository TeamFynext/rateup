import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/share-qr")({
  component: () => (
    <ComingSoon
      to="/ops/share-qr"
      description="Shareable QR codes for surveys and menus. Nothing in the API backs it yet: the old screen only built links in the browser."
    />
  ),
});
