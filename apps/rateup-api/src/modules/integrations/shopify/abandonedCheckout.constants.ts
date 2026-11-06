/**
 * The range an abandoned-checkout rule's "send after" may take, in minutes. A week is the
 * ceiling on purpose: past it the cart is stale, the buyer has moved on, and reaching them is
 * a win-back campaign's job rather than a reminder's.
 */
export const MIN_ABANDONED_DELAY_MINUTES = 15;
export const MAX_ABANDONED_DELAY_MINUTES = 7 * 24 * 60;
/** Used when a rule sets no delay of its own. */
export const DEFAULT_ABANDONED_DELAY_MINUTES = 60;
