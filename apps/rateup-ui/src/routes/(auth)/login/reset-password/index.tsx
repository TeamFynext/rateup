import { createFileRoute } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata.ts";
import ResetPasswordForm from "@/components/Form/ResetPasswordFormNew.tsx";
import { ResetSteps } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/reset-password/")({
  component: ResetPassword,
  head: () => ({
    meta: [pageMetadata["/login/reset-password"]],
  }),
});

function ResetPassword() {
  return <ResetPasswordForm mode={ResetSteps.STEP_ONE} />;
}
