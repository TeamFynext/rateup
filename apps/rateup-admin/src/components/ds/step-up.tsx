import { IconShieldLock } from "@tabler/icons-react";

import { startGoogleLogin } from "@/api/auth.api";
import { Button } from "@/components/ui/button";

/**
 * Shown inside a dialog when the API answers REAUTH_REQUIRED: the Google sign-in behind
 * this session is older than fifteen minutes, and this action wants a fresh one. Signing in
 * again is a full-page trip to Google and back to this page, where the dialog reopens.
 */
export function StepUpPrompt({ onBeforeLeave }: { onBeforeLeave?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-muted px-5 py-6 text-center">
      <div className="grid size-11 place-items-center rounded-lg bg-background">
        <IconShieldLock className="size-5" stroke={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Confirm it's you</p>
        <p className="text-xs text-muted-foreground">
          This needs a Google sign-in from the last 15 minutes. You'll come straight back here.
        </p>
      </div>
      <Button
        className="h-9 rounded-lg px-5"
        onClick={() => {
          onBeforeLeave?.();
          const { pathname, search } = window.location;
          startGoogleLogin({ returnTo: `${pathname}${search}`, reauth: true });
        }}
      >
        Sign in with Google again
      </Button>
    </div>
  );
}
