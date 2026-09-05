import { createFileRoute } from "@tanstack/react-router";

import AuthForm from "@/components/Form/AuthForm.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { buildPageHead } from "@/lib/metadata.ts";
import { AuthMode } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/login/")({
  component: Login,
  head: () => buildPageHead("/login"),
});

function Login() {
  useCheckSession();

  return <AuthForm mode={AuthMode.LOGIN} />;
}
