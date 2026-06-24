import { createFileRoute } from "@tanstack/react-router";

import AuthForm from "@/components/Form/AuthForm.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/")({
  component: Login,
});

function Login() {
  useCheckSession();

  return <AuthForm mode={AuthMode.LOGIN} />;
}
