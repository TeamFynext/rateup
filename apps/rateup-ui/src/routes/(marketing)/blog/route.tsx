import { createFileRoute, Outlet } from "@tanstack/react-router";

import { buildPageHead } from "@/lib/metadata";

export const Route = createFileRoute("/(marketing)/blog")({
  component: RouteComponent,
  head: () => buildPageHead("/blog"),
});

function RouteComponent() {
  return <Outlet />;
}
