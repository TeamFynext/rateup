import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { getRingingCalls } from "@/api/whatsapp/calling";
import { syncRingingCalls } from "@/store/callStore";
import { useSelectedTabStore } from "@/utils/store";
import {
  resolveNotificationTarget,
  type NotificationPayload,
  type NotificationTarget,
} from "@/utils/notificationTarget";

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

    const open = (target: NotificationTarget) => {
      switch (target.kind) {
        case "chat":
          // The chat screen hydrates itself from `contactId` when the selected-contact
          // store is empty, which is always the case on a cold start, so there is
          // nothing to seed here.
          router.push(`/protected/chat/${target.contactId}` as never);
          return;
        case "inbox":
          if (target.tab) useSelectedTabStore.getState().setSelectedTab(target.tab);
          router.navigate("/protected/inbox" as never);
          return;
        case "calls":
          router.push("/protected/calls" as never);
          return;
        case "order":
          router.push({
            pathname: "/protected/orders/[id]",
            params: { id: target.orderId },
          } as never);
          return;
      }
    };

    // A call push opens the call screen, not the chat: fetch what is still ringing (the
    // call may have been answered elsewhere or given up since) and let it take over.
    const handle = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification?.request?.content?.data as
        | NotificationPayload
        | undefined;
      if (data?.type === "wa_call") {
        getRingingCalls()
          .then(syncRingingCalls)
          .catch(() => undefined);
        return;
      }
      const target = resolveNotificationTarget(data);
      if (target) open(target);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || handledColdStart.current) return;
      handledColdStart.current = true;
      handle(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(handle);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
