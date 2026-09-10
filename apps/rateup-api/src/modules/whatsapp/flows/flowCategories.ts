import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "../../../types/enums.js";

/** Meta's category a RateUp-only one stands in for when the flow is created at Meta. */
const META_STAND_IN: Record<string, string> = {
  [LOYALTY_FEEDBACK_FLOW_CATEGORY]: "SURVEY",
};

/**
 * The categories to send Meta for a flow created with `categories`. Meta rejects values
 * outside its own list, so ours are replaced by the Meta category they stand in for and the
 * result is de-duplicated. The full list, ours included, is what gets stored on the row.
 */
export function metaCategoriesFor(categories: readonly string[]): string[] {
  const out: string[] = [];
  for (const category of categories) {
    const meta = META_STAND_IN[category] ?? category;
    if (!out.includes(meta)) out.push(meta);
  }
  return out;
}

export function isLoyaltyFeedbackFlow(flow: { categories: readonly string[] }): boolean {
  return flow.categories.includes(LOYALTY_FEEDBACK_FLOW_CATEGORY);
}
