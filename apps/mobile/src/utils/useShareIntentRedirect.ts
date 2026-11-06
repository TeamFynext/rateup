import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";

/**
 * Opens "Send to" when photos or videos are shared into RateUp from another app.
 *
 * Mounted under the protected layout, so a share made while signed out waits for
 * sign-in. Each share opens the screen once: the screen clears the share when a chat
 * is picked or it is dismissed, and a re-render in between must not push it again.
 */
export function useShareIntentRedirect() {
  const { hasShareIntent, shareIntent } = useShareIntentContext();
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent.files?.length) return;
    if (handled.current === shareIntent) return;
    handled.current = shareIntent;
    router.push("/protected/share" as never);
  }, [hasShareIntent, shareIntent]);
}
