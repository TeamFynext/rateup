import { createFileRoute, Outlet } from "@tanstack/react-router";

import appCss from "@/styles/app.css?url";

/**
 * Layout for the sign-in surface — login, signup, invites, password reset and the OAuth landing
 * screens.
 *
 * It exists only to attach `app.css`: these screens are built from the application's components
 * (`components/Form`, `components/LoginSignupLayout`), which are not in the marketing stylesheet's
 * `@source` list. See `src/styles/base.css` for how the scan is split.
 */
export const Route = createFileRoute("/(auth)")({
  component: () => <Outlet />,
  head: () => ({ links: [{ rel: "stylesheet", href: appCss }] }),
});
