import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

type NotificationPayload = {
  type?: string;
  /** A rateup-api notification catalogue key, on `type: "notification"` pushes. */
  event?: string;
  contactId?: string;
};

/** The chat a tap should open. Only inbox events have one; anything else just opens the app. */
function readPayload(response: Notifications.NotificationResponse | null) {
  const data = response?.notification?.request?.content?.data as NotificationPayload | undefined;
  const opensChat =
    data?.type === "wa_message" ||
    (data?.type === "notification" && data.event?.startsWith("inbox."));
  if (!opensChat) return null;
  if (typeof data?.contactId !== "string" || !data.contactId) return null;
  return data.contactId;
}

/**
 * Routes a notification tap to the chat it came from.
 *
 * Two entry points, because expo-notifications reports a tap differently
 * depending on whether the app survived it:
 *
 *  - `addNotificationResponseReceivedListener` fires when the app was already
 *    running (foreground or background).
 *  - `getLastNotificationResponseAsync` is the *cold start* case — the tap
 *    launched the process, so it happened before any listener could exist and is
 *    only readable as this one-shot record. Handling only the listener is the
 *    usual way deep links end up working from the app switcher but not from a
 *    cold tap, which is the more common way people open a notification.
 *
 * Mounted under the protected layout rather than the root so a tap can never
 * navigate an unauthenticated user into a chat; if the session is gone, the
 * layout redirects and this never runs.
 */
export function useNotificationDeepLink() {
  // The cold-start response persists across calls — without this the same tap is
  // replayed on every remount (a tab switch, a theme change) and yanks the user
  // back into a chat they already navigated away from.
  const handledColdStart = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const open = (contactId: string) => {
      // The chat screen hydrates itself from `contactId` when the selected-contact
      // store is empty, which is always the case on a cold start, so there is
      // nothing to seed here.
      router.push(`/protected/chat/${contactId}` as never);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || handledColdStart.current) return;
      handledColdStart.current = true;
      const contactId = readPayload(response);
      if (contactId) open(contactId);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const contactId = readPayload(response);
      if (contactId) open(contactId);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
