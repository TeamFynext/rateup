/**
 * Where a push notification tap should land. Pure (no React Native imports) so it can be
 * unit-tested.
 *
 * rateup-api puts a web `path` on every `type: "notification"` push
 * (`notification.render.ts`). The web dashboard renamed its URLs (inbox `?tab=mine` →
 * `assigned`, `/dashboard/campaign` → `campaigns`, `/dashboard/whatsapp/calls` →
 * `/dashboard/inbox/calls`, …), and pushes already sitting in a notification tray carry
 * the old form, so every mapping below accepts both spellings.
 */

/** The inbox's own tab keys (`useSelectedTabStore`). Labels changed, these did not. */
export type InboxTabKey = "Open" | "Closed" | "All" | "Mine" | "New" | "Favourites";

export type NotificationTarget =
  | { kind: "chat"; contactId: string }
  | { kind: "inbox"; tab?: InboxTabKey }
  | { kind: "calls" }
  | { kind: "order"; orderId: string };

export type NotificationPayload = {
  type?: string;
  /** A rateup-api notification catalogue key, on `type: "notification"` pushes. */
  event?: string;
  contactId?: string;
  /** The web dashboard path the notification opens, e.g. `/dashboard/inbox?tab=assigned&contactId=…`. */
  path?: string;
};

/**
 * Web `?tab=` values (new and pre-rename) → the app's inbox tab. Unread mentions and spam
 * contacts have no tab on mobile; they open the inbox as it is.
 */
const INBOX_TABS: Readonly<Record<string, InboxTabKey>> = {
  open: "Open",
  closed: "Closed",
  all: "All",
  assigned: "Mine",
  mine: "Mine",
  unassigned: "New",
  new: "New",
  starred: "Favourites",
  favourites: "Favourites",
  favorites: "Favourites",
};

export function inboxTabFromWeb(tab: string | null | undefined): InboxTabKey | undefined {
  if (!tab) return undefined;
  const key = tab.toLowerCase();
  return Object.hasOwn(INBOX_TABS, key) ? INBOX_TABS[key] : undefined;
}

/** Splits a web path (absolute URL or `/dashboard/...`) into segments and query. */
function parsePath(path: string): { segments: string[]; query: URLSearchParams } | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  // Drop scheme + host if a full URL slipped through, and any hash.
  const withoutOrigin = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "").split("#")[0];
  const [pathname, search = ""] = withoutOrigin.split("?");
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  return { segments, query: new URLSearchParams(search) };
}

/** Maps a web dashboard path to an app screen, or null when the app has no equivalent. */
export function targetFromPath(path: string): NotificationTarget | null {
  const parsed = parsePath(path);
  if (!parsed) return null;
  const { query } = parsed;
  const segments = parsed.segments[0] === "dashboard" ? parsed.segments.slice(1) : parsed.segments;
  const [first, second, third] = segments;

  // Calls: `/dashboard/inbox/calls` now, `/dashboard/whatsapp/calls` before.
  if ((first === "inbox" || first === "whatsapp") && second === "calls") return { kind: "calls" };

  if (first === "inbox") {
    const contactId = query.get("contactId");
    if (contactId) return { kind: "chat", contactId };
    return { kind: "inbox", tab: inboxTabFromWeb(query.get("tab")) };
  }

  // Orders: `/dashboard/commerce/orders/<id>` now, `/dashboard/whatsapp/orders/<id>` before.
  if ((first === "commerce" || first === "whatsapp") && second === "orders" && third) {
    return { kind: "order", orderId: third };
  }

  // Campaigns, pipelines, settings, automation rules, loyalty approvals, templates… have
  // no screen in the app (old or new URL alike): the tap just opens the app.
  return null;
}

/** The screen a notification tap opens, or null to just open the app. */
export function resolveNotificationTarget(
  data: NotificationPayload | null | undefined,
): NotificationTarget | null {
  if (!data) return null;
  const contactId =
    typeof data.contactId === "string" && data.contactId ? data.contactId : undefined;

  // What installed app versions have always understood: a message push opens its chat.
  if (data.type === "wa_message") return contactId ? { kind: "chat", contactId } : null;

  if (data.type !== "notification") return null;

  // An inbox event's chat wins over whichever inbox tab the path names.
  if (contactId && data.event?.startsWith("inbox.")) return { kind: "chat", contactId };

  return typeof data.path === "string" ? targetFromPath(data.path) : null;
}
