import { createFileRoute } from "@tanstack/react-router";

import { ChannelsPage } from "@/components/dashboard/settings/channels/ChannelsPage.tsx";

export const Route = createFileRoute("/dashboard/settings/channels/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ChannelsPage />;
}
