import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import NotFoundPage from "@/components/404/NotFound";
import DashboardError from "@/components/dashboard/error";
import MainSidebar from "@/components/Layout/Navbar/main-sidebar.tsx";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: DashboardError,
});

function DashboardLayout() {
  return (
    <SessionAuth>
      <MainSidebar>
        <Outlet />
      </MainSidebar>
    </SessionAuth>
  );
}
