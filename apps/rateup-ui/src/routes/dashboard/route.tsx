import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { z } from "zod/v4";

import NotFoundPage from "@/components/404/NotFound";
import DashboardError from "@/components/dashboard/error";
import MainSidebar from "@/components/Layout/Navbar/main-sidebar.tsx";
import { ConfirmProvider } from "@/context/confirm-provider";

const dashboardSearchSchema = z.looseObject({
  msg: z.string().optional(),
  tab: z.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({ msg: search.msg }),
  loader: ({ deps }) => ({ welcomeMessage: deps.msg === "welcome" }),
  component: DashboardLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: DashboardError,
});

function DashboardLayout() {
  const { welcomeMessage } = Route.useLoaderData();

  return (
    <SessionAuth>
      <ConfirmProvider>
        <MainSidebar welcomeMessage={welcomeMessage}>
          <Outlet />
        </MainSidebar>
      </ConfirmProvider>
    </SessionAuth>
  );
}
