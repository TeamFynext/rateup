import { createFileRoute } from "@tanstack/react-router";

import { MetaAgentPage } from "@/components/dashboard/metaAgent/MetaAgentPage";

export const Route = createFileRoute("/dashboard/meta-agent/")({
  component: MetaAgentPage,
});
