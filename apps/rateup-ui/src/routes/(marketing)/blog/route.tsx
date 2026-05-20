import { createFileRoute, Outlet } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooterNew";

export const Route = createFileRoute("/(marketing)/blog")({
  component: RouteComponent,
  head: () => ({
    meta: [pageMetadata["/blog"]],
  }),
});

function RouteComponent() {
  return (
    <div>
      <Outlet />
      <HomePageFooter />
    </div>
  );
}
