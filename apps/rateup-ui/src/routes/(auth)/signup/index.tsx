import { createFileRoute, useSearch } from "@tanstack/react-router";

import AuthForm from "@/components/Form/AuthForm.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { AuthMode } from "@/utils/enums/index.ts";

export const Route = createFileRoute("/(auth)/signup/")({
  /** Declares the search params this route reads, so links to it type-check. */
  validateSearch: (search: Record<string, unknown>): { auth?: string } => ({
    auth: typeof search.auth === "string" ? search.auth : undefined,
  }),
  component: Signup,
});

function Signup() {
  const searchParams = useSearch({ strict: false });
  const auth = searchParams.auth;
  useCheckSession();
  return <AuthForm mode={AuthMode.SIGNUP} authType={auth} />;
}
