/**
 * The two faces of the Feedback page once a flow exists, and the `?tab=` value each one
 * answers to. Shared by the route's search schema and the page so the two cannot disagree.
 */
export const FEEDBACK_TABS = ["settings", "results"] as const;

export type FeedbackTab = (typeof FEEDBACK_TABS)[number];

/** Base UI hands tab values back untyped; this narrows without a cast. */
export function isFeedbackTab(value: unknown): value is FeedbackTab {
  return FEEDBACK_TABS.some((tab) => tab === value);
}
