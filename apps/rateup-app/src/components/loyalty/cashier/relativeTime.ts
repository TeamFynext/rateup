import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

/**
 * "2 hours ago", for the pending-redemption alert.
 *
 * The plugin is extended here rather than relied on from elsewhere. On the web the same
 * call sits in `CustomerView` while `dayjs.extend(relativeTime)` happens in
 * `utils/dateTime.ts`, which only the *dashboard* layout imports — so on the standalone
 * `/cashier` route nothing on that path loads it and `fromNow()` is liable to be
 * undefined. Extending it in the module that calls it is what stops that being possible.
 *
 * `dayjs.extend` is idempotent, so this costs nothing when another screen has already run it.
 */
dayjs.extend(relativeTime);

export function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return "";
  const at = dayjs(iso);
  return at.isValid() ? at.fromNow() : "";
}
