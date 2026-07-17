import { useQuery } from "@tanstack/react-query";

import { useSubscription } from "../subscription/subscription.query";
import { getUsageStats } from "./stats.api";

export const useUsageStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: getUsageStats,
    // Usage counters change server-side (conversations, messages, resets), so
    // always pull fresh numbers whenever the billing page is (re)visited.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

/// Mirrors the backend `checkConversationLimitExceeded` guard so the UI can warn
/// before an outbound send is rejected with a 403. Monthly plans cap at
/// `whatsapp.conversation.count.max` per month; annual (pooled) plans cap at
/// `max * 12` across the year, matching each branch's counter.
export const useConversationLimit = () => {
  const { data: stats } = useUsageStats();
  const { data: subscription } = useSubscription();

  const isAnnual = !!subscription?.isAnnualMessageLimit;
  const max = subscription?.features?.whatsapp?.conversation?.count?.max;
  const limit = isAnnual ? (max || 0) * 12 : max;
  const used = (isAnnual ? stats?.annualConversationsCount : stats?.monthlyConversationsCount) ?? 0;

  const hasLimit = typeof limit === "number" && limit > 0;
  const isExceeded = hasLimit && used >= limit;

  return { isExceeded, used, limit: limit ?? 0, isAnnual, hasLimit };
};
