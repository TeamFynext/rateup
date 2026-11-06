import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppProviders } from "@/components/AppProviders";
import { loadAppRuntime } from "@/lib/appRuntime";

import appCss from "@/styles/app.css?url";

/**
 * Layout for the sign-in surface — login, signup, invites, password reset and the OAuth landing
 * screens.
 *
 * It attaches `app.css`, because these screens are built from the application's components
 * (`components/Form`, `components/LoginSignupLayout`), which are not in the marketing stylesheet's
 * `@source` list (see `src/styles/base.css`). It also loads the app runtime the forms sign in with.
 */
export const Route = createFileRoute("/(auth)")({
  beforeLoad: loadAppRuntime,
  component: () => (
    <AppProviders>
      <Outlet />
    </AppProviders>
  ),
  head: () => ({ links: [{ rel: "stylesheet", href: appCss }] }),
});
