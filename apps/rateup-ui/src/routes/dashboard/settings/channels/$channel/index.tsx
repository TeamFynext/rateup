import { createFileRoute } from "@tanstack/react-router";

import { ChannelDetailsPage } from "@/components/dashboard/settings/channels/ChannelDetailsPage.tsx";

export const Route = createFileRoute("/dashboard/settings/channels/$channel/")({
  component: ChannelDetailsPage,
});
