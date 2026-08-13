import { createFileRoute } from "@tanstack/react-router";

import { MetaAgentSection } from "@/components/dashboard/metaAgent/MetaAgentSection";

export const Route = createFileRoute("/dashboard/meta-agent/operate")({
  component: () => <MetaAgentSection section="operate" />,
});
