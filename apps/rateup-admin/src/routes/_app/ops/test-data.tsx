import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/test-data")({
  component: () => (
    <ComingSoon
      to="/ops/test-data"
      description="Generates fake survey responses and WhatsApp chats for a test organisation. Every part of it writes data, so it arrives with the actions phase."
    />
  ),
});
