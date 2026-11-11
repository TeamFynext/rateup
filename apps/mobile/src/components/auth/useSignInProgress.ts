import { useCallback, useMemo, useState } from "react";

export type SignInMethod = "email" | "google" | "apple";

/**
 * Which sign-in is running and what it is doing, shared by the sign-in page's three
 * methods. While one runs, the others are dimmed and locked, and the page shows the
 * stage text in its overlay.
 */
export type SignInProgress = {
  active: SignInMethod | null;
  stage: string | null;
  /** The button was pressed. */
  begin: (method: SignInMethod) => void;
  /** The account was accepted; the app is now loading the inbox. */
  succeeded: () => void;
  /** Finished, whether it worked or not (the caller shows any error). */
  end: (opts?: { failed?: boolean }) => void;
};

export function useSignInProgress(): SignInProgress {
  const [active, setActive] = useState<SignInMethod | null>(null);
  const [stage, setStage] = useState<string | null>(null);

  const begin = useCallback((method: SignInMethod) => {
    setActive(method);
    setStage("Signing you in…");
  }, []);

  const succeeded = useCallback(() => setStage("Loading your inbox…"), []);

  const end = useCallback(() => {
    setActive(null);
    setStage(null);
  }, []);

  return useMemo(
    () => ({ active, stage, begin, succeeded, end }),
    [active, stage, begin, succeeded, end],
  );
}
