import { createFileRoute } from "@tanstack/react-router";

import { MemberPage } from "@/components/dashboard/settings/members/MemberPage.tsx";

export const Route = createFileRoute("/dashboard/settings/members/$memberId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { memberId } = Route.useParams();
  return <MemberPage memberId={memberId} />;
}
