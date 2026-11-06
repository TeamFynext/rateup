import { useEffect } from "react";
import { AppState } from "react-native";
import { syncPushToken } from "./notification";

/**
 * Keeps this device's push registration current for as long as someone is signed
 * in.
 *
 * Registration used to happen only at sign-in, so a token that rotated during a
 * long-lived session was never re-sent: a reinstall, a device restore, or an
 * OS-level reset left the server pushing to an address that no longer resolved,
 * and nothing corrected it until the user happened to sign out and back in.
 *
 * Foreground is the moment to check because that is when a rotation becomes
 * visible to us — the token is re-issued while the app is not running. The call
 * is cheap when nothing has changed: `syncPushToken` only reaches the network
 * when the token actually differs from the one this run already registered.
 *
 * Never prompts. If notification permission has not been granted this quietly
 * does nothing, so a user who declined is not asked again every time they open
 * the app; sign-in remains the one place that asks.
 */
export function usePushTokenSync() {
  useEffect(() => {
    syncPushToken();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncPushToken();
    });

    return () => subscription.remove();
  }, []);
}
