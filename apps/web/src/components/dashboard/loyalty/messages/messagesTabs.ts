/**
 * The four faces of the Messages page, and the `?tab=` value each one answers to.
 * Shared by the route's search schema and the page so the two cannot disagree.
 */
export const MESSAGES_TABS = ["automatic", "replies", "chatbot", "templates"] as const;

export type MessagesTab = (typeof MESSAGES_TABS)[number];

/** Base UI hands tab values back untyped; this narrows without a cast. */
export function isMessagesTab(value: unknown): value is MessagesTab {
  return MESSAGES_TABS.some((tab) => tab === value);
}
