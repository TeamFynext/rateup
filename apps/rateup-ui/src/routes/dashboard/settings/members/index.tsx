import { createFileRoute } from "@tanstack/react-router";

import { MembersPage } from "@/components/dashboard/settings/members/MembersPage.tsx";

export const Route = createFileRoute("/dashboard/settings/members/")({
  component: MembersPage,
});
