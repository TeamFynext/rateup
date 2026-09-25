import { useCallback, useEffect, useState } from "react";

export type DesktopPermission = NotificationPermission | "unsupported";

export function desktopPermission(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Shows a system notification, if this browser has allowed them. Returns whether it did. */
export function showDesktopNotification(options: {
  title: string;
  body: string;
  /** Replaces an earlier notification with the same tag instead of stacking a second one. */
  tag?: string;
  onClick?: () => void;
}): boolean {
  if (desktopPermission() !== "granted") return false;
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: "/favicon.png",
    });
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
    return true;
  } catch {
    // Some mobile browsers expose the constructor but throw without a service worker.
    return false;
  }
}

/** This browser's permission, and a way to ask for it. The answer is per browser, not per account. */
export function useDesktopPermission() {
  const [permission, setPermission] = useState<DesktopPermission>(desktopPermission);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const update = () => setPermission(desktopPermission());
    navigator.permissions
      .query({ name: "notifications" })
      .then((result) => {
        status = result;
        result.addEventListener("change", update);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", update);
  }, []);

  const request = useCallback(async () => {
    if (desktopPermission() === "unsupported") return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, request };
}
