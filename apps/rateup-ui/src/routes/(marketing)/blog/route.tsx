import { createFileRoute, Outlet } from "@tanstack/react-router";

import { buildPageHead } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooterNew";

export const Route = createFileRoute("/(marketing)/blog")({
  component: RouteComponent,
  head: () => buildPageHead("/blog"),
});

function RouteComponent() {
  return (
    <div>
      <Outlet />
      <HomePageFooter />
    </div>
  );
}
