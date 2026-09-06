import { useQuery } from "@tanstack/react-query";

import { useSubscription } from "../subscription/subscription.query";
import { getUsageStats } from "./stats.api";

/**
 * `enabled` is for callers mounted app-wide (the sidebar): this query is
 * deliberately staleTime:0 and refetches on focus, so it should only run on the
 * screens that show a usage number. Defaults to on for the billing pages.
 */
export const useUsageStats = (enabled = true) =>
  useQuery({
    queryKey: ["stats"],
    queryFn: getUsageStats,
    enabled,
    // Usage counters change server-side (conversations, messages, resets), so
    // always pull fresh numbers whenever the billing page is (re)visited.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

/// Mirrors the backend `checkConversationLimitAvailable` guard so the UI can warn
/// before an outbound send is rejected with a 403. Monthly plans cap at
/// `whatsapp.conversation.count.max` per month; annual (pooled) plans cap at
/// `max * 12` across the year, matching each branch's counter.
///
/// Reads the METERED counters (self-derived 24h conversation windows), which is what
/// the server enforces against — not the inbox-ticket counters.
export const useConversationLimit = (enabled = true) => {
  const { data: stats } = useUsageStats(enabled);
  const { data: subscription } = useSubscription();

  const isAnnual = !!subscription?.isAnnualMessageLimit;
  const max = subscription?.features?.whatsapp?.conversation?.count?.max;
  const limit = isAnnual ? (max || 0) * 12 : max;
  const used =
    (isAnnual ? stats?.annualMeteredConversationsCount : stats?.monthlyMeteredConversationsCount) ??
    0;

  const hasLimit = typeof limit === "number" && limit > 0;
  const isExceeded = hasLimit && used >= limit;

  return { isExceeded, used, limit: limit ?? 0, isAnnual, hasLimit };
};
