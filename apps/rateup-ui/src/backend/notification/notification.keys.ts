/**
 * Query keys for notifications.
 *
 * Byte-identical to the inline keys they replaced. `notification` and `notificationCount`
 * are separate roots, so mutations invalidate both by hand — preserved as-is.
 */
export const notificationKeys = {
  all: () => ["notification"] as const,
  count: () => ["notificationCount"] as const,
  settings: () => ["notificationSettings"] as const,
} as const;
