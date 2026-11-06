import { createFileRoute } from "@tanstack/react-router";

import { MetaAgentLayout } from "@/components/dashboard/metaAgent/MetaAgentLayout";

export const Route = createFileRoute("/dashboard/meta-agent")({
  component: MetaAgentLayout,
});
