import { createFileRoute } from "@tanstack/react-router";

import { RolesMatrixPage } from "@/components/dashboard/settings/members/RolesMatrixPage.tsx";

export const Route = createFileRoute("/dashboard/settings/members/roles")({
  component: RolesMatrixPage,
});
