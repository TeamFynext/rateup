import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { z } from "zod/v4";

import NotFoundPage from "@/components/404/NotFound";
import DashboardError from "@/components/dashboard/error";
import MainSidebar from "@/components/Layout/Navbar/main-sidebar.tsx";
import { ConfirmProvider } from "@/context/confirm-provider";
import { isEmailVerified, VERIFY_EMAIL_PATH } from "@/utils/auth/emailVerification.ts";

import appCss from "@/styles/app.css?url";

const dashboardSearchSchema = z.looseObject({
  msg: z.string().optional(),
  tab: z.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  /* The application half of the Tailwind scan — see src/styles/app.css. */
  head: () => ({ links: [{ rel: "stylesheet", href: appCss }] }),
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  // Every dashboard URL, not just the index: a visitor who signed up and never verified
  // comes back to whatever page they last had open (or a bookmark, or a restored tab),
  // and only `/dashboard/` used to check. Anywhere deeper let them into the shell, where
  // the API answers 403 "invalid claim" to each request instead — EmailVerification runs
  // in REQUIRED mode, so the verify screen is the only page such a session can use.
  beforeLoad: async () => {
    // The claim is read from the session on the client; there is none to read on the
    // server, and answering "unverified" there would bounce every visitor.
    if (typeof window === "undefined") return;
    if (await isEmailVerified()) return;

    throw redirect({
      to: VERIFY_EMAIL_PATH,
      replace: true,
    });
  },
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
