/**
 * Product announcements — the source for the sidebar's "What's new" card.
 *
 * Add an entry in the same PR that ships the change. Order here does not matter;
 * the UI sorts by `publishedAt`, newest first.
 *
 * `id` is what read state is keyed on, and that state lives in the reader's
 * browser. Never reuse or renumber an id: an entry that changes id comes back as
 * unread for everyone, and an entry that inherits a retired id is never seen.
 *
 * Keep `title` under ~50 characters — the card is 224px wide and clamps to two
 * lines. `summary` is only rendered in the full list, so it can breathe.
 */

export type AnnouncementKind = "new" | "improvement" | "fix";

export interface AnnouncementLink {
  /** In-app route, e.g. "/dashboard/inbox". */
  readonly to: string;
  /** Optional search params for the route, e.g. `{ tab: "spam" }`. */
  readonly search?: Record<string, unknown>;
  /** Call to action; falls back to "Take a look". */
  readonly label?: string;
}

export interface Announcement {
  /** Stable, never reused. Convention: `YYYY-MM-DD-short-slug`. */
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** ISO date (YYYY-MM-DD). */
  readonly publishedAt: string;
  readonly kinds: readonly AnnouncementKind[];
  /** Product area chip, e.g. "Inbox". Keep to one or two words. */
  readonly area?: string;
  readonly link?: AnnouncementLink;
}

export const ANNOUNCEMENTS: readonly Announcement[] = [
  {
    id: "2026-07-23-spam-tab",
    title: "Spam has its own tab",
    summary:
      "Flag a contact as spam and every conversation with them leaves your working tabs for the new Spam tab. The flag is per contact, so unflagging brings the whole history back.",
    publishedAt: "2026-07-23",
    kinds: ["new"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", search: { tab: "spam" }, label: "Open Spam" },
  },
  {
    id: "2026-07-22-inbox-conversations",
    title: "The inbox is conversation-first",
    summary:
      "Each row is now a conversation rather than a contact, so a contact who writes back after a closed ticket opens a fresh one — the resolved thread stays resolved, and Mine, Mentions and Spam counts follow the same grain.",
    publishedAt: "2026-07-22",
    kinds: ["improvement"],
    area: "Inbox",
    link: { to: "/dashboard/inbox", label: "Open inbox" },
  },
  {
    id: "2026-07-22-team-channel-permissions",
    title: "Per-team channel permissions",
    summary:
      "Decide which teams can see and reply on which channels. Agents only get the conversations their team is entitled to, and assignment respects the same boundary.",
    publishedAt: "2026-07-22",
    kinds: ["new"],
    area: "Settings",
    link: { to: "/dashboard/settings/team", label: "Manage teams" },
  },
  {
    id: "2026-07-22-survey-builder",
    title: "Rebuilt survey builder",
    summary:
      "Question editing, settings and theming are now separate panes, so you can restyle a survey without touching its questions — and preview the result as you go.",
    publishedAt: "2026-07-22",
    kinds: ["new", "improvement"],
    area: "Surveys",
    link: { to: "/dashboard/surveys", label: "Open surveys" },
  },
];
