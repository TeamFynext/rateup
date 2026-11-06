import { createFileRoute } from "@tanstack/react-router";

import AuthForm from "@/components/Form/AuthForm.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/verify-email/")({
  component: VerifyEmail,
});

function VerifyEmail() {
  useCheckSession();
  return <AuthForm mode={AuthMode.VERIFY} />;
}
