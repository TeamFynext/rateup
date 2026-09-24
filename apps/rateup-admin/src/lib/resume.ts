/**
 * Step-up sends the browser away to Google and back. Whatever the staff member was in the
 * middle of is remembered here so the page can reopen it on return, instead of making them
 * find the card and click Apply again. Session storage: one tab, gone when it closes.
 */
const KEY = "rateup-admin:resume";

export interface ResumeIntent {
  /** The page that stored it; anything else that finds it ignores it. */
  path: string;
  kind: string;
  id: string;
}

export function rememberIntent(intent: ResumeIntent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent));
  } catch {
    // Private mode or blocked storage: the person clicks Apply again, that is all.
  }
}

/** Reads and clears the stored intent, if it belongs to this page. */
export function takeIntent(path: string, kind: string): ResumeIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const intent = JSON.parse(raw) as ResumeIntent;
    return intent.path === path && intent.kind === kind ? intent : null;
  } catch {
    return null;
  }
}
