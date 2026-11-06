/**
 * The iOS share extension reopens the app on `rateup://dataUrl=rateupShareKey...`, which
 * names no route. expo-share-intent reads that URL itself, so the router only needs to
 * not treat it as a page: on a cold start it goes to `/` (which signs in or opens the
 * inbox), and in a running app it stays where it is. The protected layout then opens
 * "Send to" for whatever was shared.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (path.includes("dataUrl=")) return initial ? "/" : null;
    return path;
  } catch {
    return "/";
  }
}
