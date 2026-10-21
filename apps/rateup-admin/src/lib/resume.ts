/**
 * Step-up sends the browser away to Google and back. Whatever the staff member was in the
 * middle of is remembered here so the page can reopen it on return, instead of making them
 * find the card and click Apply again. Session storage: one tab, gone when it closes.
 *
 * Only ever reopens: the dialog comes back with its fields filled in, and the staff member
 * still presses the button. Nothing is sent on their behalf.
 */
const KEY = "rateup-admin:resume";

/** A trip to Google that has not come back by now was abandoned; do not reopen it later. */
export const RESUME_MAX_AGE_MS = 15 * 60 * 1000;

export interface ResumeIntent {
  /** The page that stored it; anything else that finds it ignores it. */
  path: string;
  kind: string;
  id: string;
  /** The reason typed so far, put back into the dialog's reason field. */
  reason?: string;
  /** The dialog's own fields, as it chose to save them. Check its shape before using it. */
  draft?: unknown;
}

interface Stored extends ResumeIntent {
  at: number;
}

export function rememberIntent(intent: ResumeIntent, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...intent, at: now } satisfies Stored));
  } catch {
    // Private mode or blocked storage: the person clicks Apply again, that is all.
  }
}

/**
 * Reads and clears the stored intent, if it belongs to this page and is one of `kinds`.
 * One for another kind on the same page is left for the component that handles it (an org
 * page's header and its tabs each take their own); one for another page, or too old, is
 * dropped.
 */
export function takeIntent(
  path: string,
  kinds: string | readonly string[],
  now = Date.now(),
): ResumeIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Stored> | null;
    const fresh =
      !!stored &&
      typeof stored.at === "number" &&
      now - stored.at <= RESUME_MAX_AGE_MS &&
      typeof stored.kind === "string" &&
      typeof stored.id === "string";
    if (!fresh || stored.path !== path) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    const wanted = typeof kinds === "string" ? [kinds] : kinds;
    if (!wanted.includes(stored.kind as string)) return null;
    sessionStorage.removeItem(KEY);
    const { at: _at, ...intent } = stored as Stored;
    return intent;
  } catch {
    return null;
  }
}
