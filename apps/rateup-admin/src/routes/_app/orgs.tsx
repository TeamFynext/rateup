import { createFileRoute, Outlet } from "@tanstack/react-router";

import { orgDirectorySearchSchema } from "@/components/org/org-list-options";

export const Route = createFileRoute("/_app/orgs")({
  validateSearch: orgDirectorySearchSchema,
  component: Outlet,
});
