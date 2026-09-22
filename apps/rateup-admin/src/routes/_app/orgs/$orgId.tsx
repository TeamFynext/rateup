import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/orgs/$orgId")({
  component: OrgDetail,
});

function OrgDetail() {
  const { orgId } = Route.useParams();
  return <ComingSoon title="Organisation" description={orgId} />;
}
