import { IconBrandGoogleFilled, IconLock } from "@tabler/icons-react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { startGoogleLogin } from "@/api/auth.api";
import { meQueryOptions } from "@/api/auth.query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Reasons the API's OIDC callback sends back as `?error=`. Every refusal reads the same, so
 * the page never says which domain is accepted or whether an account is on the staff list;
 * the real reason is in the audit log (`staff.login_denied`).
 */
const DENIED = "This account can't sign in here. Ask a console owner if you need access.";
const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: DENIED,
  domain: DENIED,
  access_mismatch: DENIED,
  expired: "The sign-in attempt expired. Try again.",
};

const loginSearchSchema = z.object({
  returnTo: z.string().optional(),
  error: z.string().optional(),
});

/** Only same-origin paths, so `?returnTo=` can't be turned into an open redirect. */
function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const staff = await context.queryClient.ensureQueryData(meQueryOptions).catch(() => null);
    if (staff) throw redirect({ href: safeReturnTo(search.returnTo) });
  },
  component: LoginPage,
});

function LoginPage() {
  const { returnTo, error } = Route.useSearch();
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full max-w-105 flex-col gap-10 rounded-3xl border bg-card p-8 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-tight">RateUp</span>
            <span className="text-sm font-medium text-muted-foreground">Admin</span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-rail text-rail-foreground">
            <IconLock className="size-4.5" />
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-[26px] leading-tight font-medium tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">Restricted to RateUp team members.</p>
        </div>

        <div className="flex flex-col gap-4">
          {errorMessage && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Button
            size="lg"
            className="h-12 w-full rounded-2xl text-[15px]"
            onClick={() => startGoogleLogin({ returnTo: safeReturnTo(returnTo) })}
          >
            <IconBrandGoogleFilled />
            Continue with Google
          </Button>
        </div>
      </div>
    </main>
  );
}
