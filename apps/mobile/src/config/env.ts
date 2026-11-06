/**
 * The API origin, checked once at startup.
 *
 * `EXPO_PUBLIC_API_URL` is inlined at build time. A release build made without it used to
 * fall back to `http://localhost:3001` (and so `ws://` for the live socket) and fail in
 * confusing ways, or — worse — talk cleartext to whatever answered. A release build now
 * refuses to start unless the URL is set and is `https://`. Development keeps the
 * localhost fallback.
 */
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

function resolveApiUrl(): string {
  // Must stay a direct `process.env.EXPO_PUBLIC_*` read: that is what Expo inlines.
  const value = process.env.EXPO_PUBLIC_API_URL;
  const raw = value?.trim().replace(/\/+$/, "");

  if (isDev) return raw || "http://localhost:3001";

  if (!raw) {
    throw new Error("EXPO_PUBLIC_API_URL is not set; this build cannot reach the RateUp API.");
  }
  if (!raw.startsWith("https://")) {
    throw new Error("EXPO_PUBLIC_API_URL must be an https:// URL in release builds.");
  }
  return raw;
}

export const API_URL = resolveApiUrl();
