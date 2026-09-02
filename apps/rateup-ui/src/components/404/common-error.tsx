import * as Sentry from "@sentry/tanstackstart-react";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { cx } from "class-variance-authority";
import { useEffect } from "react";

import { Button } from "@/components/ui/button.tsx";

/**
 * Turns `/dashboard/settings/billing` into "your billing", and anything that isn't a
 * plain word into "this page".
 *
 * The last segment is often an id — `/dashboard/contacts/3f9c-…` would otherwise
 * apologise for failing to load "your 3f9c-…", which reads like a second bug.
 */
function subjectFrom(pathname: string | undefined) {
  const segment = pathname?.split("/").filter(Boolean).pop();
  if (!segment || segment.length > 24 || !/^[a-z][a-z-]*$/i.test(segment)) return "this page";
  return `your ${segment.replace(/-/g, " ")}`;
}

const CommonError = ({
  error,
  reset,
  className = "",
  homeTo = "/",
}: {
  // The route-level error boundaries forward these through, so both are optional.
  error?: Error & { digest?: string };
  reset?: () => void;
  className?: string;
  /** Where "Go back" lands. The dashboard boundary keeps the customer inside the app. */
  homeTo?: "/" | "/dashboard";
}) => {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  useEffect(() => {
    // Without the guard every mount of a boundary that rendered without an error — a
    // reset that re-throws nothing, for one — reported an empty exception to Sentry.
    if (error) Sentry.captureException(error);
  }, [error]);

  const handleRetry = () => {
    // `reset` comes from the router's boundary and is the real retry: it clears the
    // error and re-runs the route. Falling back to `invalidate` means the button still
    // does something when a caller renders this component without one, rather than
    // looking live and doing nothing.
    if (reset) reset();
    else router.invalidate();
  };

  return (
    <div
      className={cx("flex h-full w-full flex-col items-center justify-center gap-6 p-8", className)}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <IconAlertTriangle size={30} stroke={1.8} />
      </div>

      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h2>
        <p className="text-muted-foreground">
          We couldn&apos;t load {subjectFrom(pathname)}. This is usually temporary — try again, and
          tell us if it keeps happening.
        </p>
      </div>

      {/* The digest is what support can match against the Sentry event, so it is worth
          showing even though the message itself is not. */}
      {error?.digest && (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}

      {/* Development only: in production the message can carry internals, and a customer
          can do nothing with it either way. */}
      {import.meta.env.DEV && error?.message && (
        <pre className="max-w-xl overflow-x-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleRetry} className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="ghost" onClick={() => navigate({ to: homeTo })}>
          {homeTo === "/dashboard" ? "Back to dashboard" : "Back to homepage"}
        </Button>
      </div>
    </div>
  );
};

export default CommonError;
