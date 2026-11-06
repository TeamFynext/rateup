import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SessionAuth } from "supertokens-auth-react/recipe/session";

import NotFoundPage from "@/components/404/NotFound";
import { AppProviders } from "@/components/AppProviders";
import DashboardError from "@/components/dashboard/error";
import MainSidebar from "@/components/Layout/Navbar/main-sidebar.tsx";
import { ConfirmProvider } from "@/context/confirm-provider";
import { loadAppRuntime } from "@/lib/appRuntime";

import appCss from "@/styles/app.css?url";

/* Loose on purpose: child routes read their own params from the same query string. */
interface DashboardSearch {
  msg?: string;
  tab?: string;
  [key: string]: unknown;
}

const dashboardSearch = (search: Record<string, unknown>): DashboardSearch => ({
  ...search,
  msg: typeof search.msg === "string" ? search.msg : undefined,
  tab: typeof search.tab === "string" ? search.tab : undefined,
});

export const Route = createFileRoute("/dashboard")({
  /* The application half of the Tailwind scan — see src/styles/app.css. */
  head: () => ({ links: [{ rel: "stylesheet", href: appCss }] }),
  validateSearch: dashboardSearch,
  // Every dashboard URL, not just the index: a visitor who signed up and never verified
  // comes back to whatever page they last had open (or a bookmark, or a restored tab),
  // and only `/dashboard/` used to check. Anywhere deeper let them into the shell, where
  // the API answers 403 "invalid claim" to each request instead — EmailVerification runs
  // in REQUIRED mode, so the verify screen is the only page such a session can use.
  beforeLoad: async () => {
    await loadAppRuntime();
    // The claim is read from the session on the client; there is none to read on the
    // server, and answering "unverified" there would bounce every visitor.
    if (typeof window === "undefined") return;
    const { isEmailVerified, VERIFY_EMAIL_PATH } =
      await import("@/utils/auth/emailVerification.ts");
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
    <AppProviders>
      <SessionAuth>
        <ConfirmProvider>
          <MainSidebar welcomeMessage={welcomeMessage}>
            <Outlet />
          </MainSidebar>
        </ConfirmProvider>
      </SessionAuth>
    </AppProviders>
  );
}
