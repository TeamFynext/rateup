import { createFileRoute, redirect } from "@tanstack/react-router";

import { BusinessProfileFlow } from "@/components/Form/BusinessProfileFlow.tsx";

export const Route = createFileRoute("/(auth)/signup/business/")({
  // Saving needs a verified session, which the API checks on every call; the session is
  // only readable in the browser.
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { default: Session } = await import("supertokens-auth-react/recipe/session");
    if (!(await Session.doesSessionExist())) throw redirect({ to: "/login", replace: true });
    const { isEmailVerified, VERIFY_EMAIL_PATH } =
      await import("@/utils/auth/emailVerification.ts");
    if (!(await isEmailVerified())) throw redirect({ to: VERIFY_EMAIL_PATH, replace: true });
  },
  component: BusinessProfileFlow,
});
