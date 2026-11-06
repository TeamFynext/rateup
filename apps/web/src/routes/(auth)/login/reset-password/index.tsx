import { createFileRoute } from "@tanstack/react-router";

import ResetPasswordForm from "@/components/Form/ResetPasswordFormNew.tsx";
import { buildPageHead } from "@/lib/metadata.ts";
import { ResetSteps } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/reset-password/")({
  /** Declares the search params the form reads, so they arrive typed. */
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; rid?: string; requestStatus?: string; emailTo?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
    rid: typeof search.rid === "string" ? search.rid : undefined,
    requestStatus: typeof search.requestStatus === "string" ? search.requestStatus : undefined,
    emailTo: typeof search.emailTo === "string" ? search.emailTo : undefined,
  }),
  component: ResetPassword,
  head: () => buildPageHead("/login/reset-password"),
});

function ResetPassword() {
  return <ResetPasswordForm mode={ResetSteps.STEP_ONE} />;
}
