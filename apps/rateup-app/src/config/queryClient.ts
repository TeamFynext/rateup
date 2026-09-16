import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";

/**
 * The app's single QueryClient.
 *
 * Lives here rather than in `app/_layout.tsx` so that non-React modules can
 * reach it without importing the root layout, which would pull the whole
 * screen graph in and create an import cycle. `clearLocalUserData` needs it to
 * drop cached responses on sign-out.
 */
export const queryClient = new QueryClient();

/**
 * Tell react-query when the app returns to the foreground.
 *
 * `refetchOnWindowFocus` is on by default, but React Native has no window focus
 * event, so it never fired: a message that arrived while the phone was
 * backgrounded — when the socket is down and its frames are simply lost — stayed
 * missing from the inbox and the open thread until the user left and came back.
 * With this, every query on screen refetches on resume; unmounted screens only go
 * stale and fetch when they next mount.
 *
 * react-query's documented React Native wiring. `setEventListener` subscribes
 * only while the focus manager has listeners, and unsubscribes on its own.
 */
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) => {
    handleFocus(state === "active");
  });
  return () => subscription.remove();
});
