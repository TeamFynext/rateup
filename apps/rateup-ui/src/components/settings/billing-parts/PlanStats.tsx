// Extracted verbatim from `billing.tsx`. Behaviour is unchanged.

import {
  IconClipboardList,
  IconGift,
  IconMessageCircle,
  IconRobot,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { ConversationAddonOffer } from "@/backend/payment/payment.api";
import type { UsageStats } from "@/backend/stats/stats.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";

export const TeamStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const statsArray = [
    {
      count: stats?.teamsCount,
      totalCount: subscription?.features?.team?.count?.max,
      stats: "Teams",
    },
    {
      count: stats?.teamMembersCount,
      totalCount: subscription?.features?.team?.teamMember?.count?.max,
      stats: "Team Staff",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <IconUsers className="w-4 h-4" />
        {translations("Team")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                <span>
                  {count.toLocaleString()} / {totalCount.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                {translations("remaining")}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export const SurveyStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const isActive = subscription?.features?.webSurvey?.active;
  if (!isActive) return null;

  // Only the monthly response allowance is a limit the customer can act on here; the
  // survey count and the all-time response total are analytics and belong on the survey
  // dashboard, not on a billing usage meter.
  const count = stats?.monthlySurveyResponses || 0;
  const totalCount = subscription?.features?.webSurvey?.count?.monthlyResponseLimit || 0;
  const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
  const remaining = totalCount - count;

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <IconClipboardList className="w-4 h-4" />
        {translations("Web Survey")}
      </h3>
      <div className="flex flex-col justify-center gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{translations("Monthly Responses")}</span>
          {totalCount > 0 ? (
            <span>
              {count.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
          ) : (
            <span>{count.toLocaleString()}</span>
          )}
        </div>
        {totalCount > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
              {translations("remaining")}
            </p>
          </>
        )}
      </div>
    </Card>
  );
};

export const WhatsappStats = ({
  stats,
  subscription,
  allowance,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
  /** The org's real allowance, packs included, as the add-on endpoint computes it. */
  allowance?: ConversationAddonOffer["allowance"];
}) => {
  const { t: translations } = useTranslation();
  const isActive = subscription?.features?.whatsapp?.active;
  if (!isActive) return null;

  const isAnnual = subscription?.isAnnualMessageLimit;
  const label = isAnnual ? "Annual Conversation" : "Monthly Conversation";
  // The METERED counters: self-derived 24h conversation windows, which is the unit the
  // plan allowance is enforced against. The inbox-ticket counters are analytics only.
  const rawCount =
    (isAnnual ? stats?.annualMeteredConversationsCount : stats?.monthlyMeteredConversationsCount) ||
    0;
  // Metered against the allowance the send gate actually enforces — `effectiveMax` is the
  // plan's number *plus* any packs still in date. Reading the plan's number alone showed a
  // customer who had paid for headroom a full bar and an overage badge while their sends
  // kept going through. `undefined` means the plan is not metered at all (Enterprise), so
  // fall back to the stored feature and leave that rendering as it was.
  //
  // The ×12 mirrors the gate: an annual-limit org is measured against twelve months of
  // the monthly allowance, packs included.
  const monthlyMax =
    allowance?.effectiveMax ?? subscription?.features?.whatsapp?.conversation?.count?.max ?? 0;
  const totalCount = (isAnnual ? monthlyMax * 12 : monthlyMax) || 0;
  const addonConversations = allowance?.addonConversations ?? 0;
  const addonTotal = isAnnual ? addonConversations * 12 : addonConversations;
  const planTotal = totalCount - addonTotal;

  // Once usage exceeds the allowance we cap the bar/label at the limit (e.g. 4/4,
  // 100% used, 0 remaining) and surface the surplus separately as "+N more", so
  // the meter never renders past full or shows negative remaining counts.
  const hasLimit = totalCount > 0;
  const displayCount = hasLimit ? Math.min(rawCount, totalCount) : rawCount;
  const overage = hasLimit ? Math.max(rawCount - totalCount, 0) : 0;
  const percentage = hasLimit ? Math.min((rawCount / totalCount) * 100, 100) : 0;
  const remaining = Math.max(totalCount - rawCount, 0);

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <IconMessageCircle className="w-4 h-4" />
        {translations("Whatsapp")}
      </h3>
      <div className="flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{translations(label)}</span>
          <div className="flex items-center gap-2">
            {hasLimit ? (
              <span>
                {displayCount.toLocaleString()} / {totalCount.toLocaleString()}
              </span>
            ) : (
              <span>{rawCount.toLocaleString()}</span>
            )}
            {overage > 0 && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
                +{overage.toLocaleString()} {translations("more")}
              </Badge>
            )}
          </div>
        </div>
        {hasLimit && (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-3 rounded-full transition-all ${
                  overage > 0 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
              {translations("remaining")}
            </p>
          </>
        )}
        {addonTotal > 0 && (
          // Where the extra headroom came from. Without this the allowance simply reads
          // larger than the plan sells, which looks like a bug rather than a purchase.
          <p className="text-xs text-muted-foreground">
            {translations("Plan")} {planTotal.toLocaleString()} +{" "}
            <span className="font-medium text-foreground">{addonTotal.toLocaleString()}</span>{" "}
            {translations("from conversation packs")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {translations(
            "A conversation is a 24-hour window with one customer, on any channel. Message delivery is billed to your WhatsApp account by Meta and is not included here.",
          )}
        </p>
      </div>
    </Card>
  );
};

export const AIStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const aiFeature = subscription?.features?.ai;
  if (!aiFeature || !aiFeature?.active) return null;

  const statsArray = [
    {
      count: stats?.aiPromptTokensCount,
      totalCount: aiFeature?.count.promptTokens,
      stats: "Input Tokens",
    },
    {
      count: stats?.aiCompletionTokensCount,
      totalCount: aiFeature?.count.completionTokens,
      stats: "Output Tokens",
    },
  ];

  return (
    <Card className="p-6 shadow-sm border-gray-200">
      <h3 className="flex items-center gap-1">
        <IconRobot className="w-4 h-4" />
        {translations("AI")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                {totalCount > 0 ? (
                  <span>
                    {count.toLocaleString()} / {totalCount.toLocaleString()}
                  </span>
                ) : (
                  <span>{count.toLocaleString()}</span>
                )}
              </div>
              {totalCount > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                    {translations("remaining")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export const LoyaltyStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const loyalty = subscription?.features?.loyalty;
  if (!loyalty || !loyalty?.active) return null;

  const statsArray = [
    {
      count: stats?.loyaltyActionCount,
      totalCount: loyalty?.action?.count?.max,
      stats: "Actions",
    },
    {
      count: stats?.loyaltyRewardCount,
      totalCount: loyalty?.reward?.count?.max,
      stats: "Rewards",
    },
    {
      count: stats?.loyaltyCustomerCount,
      totalCount: loyalty?.customer?.count?.max,
      stats: "Customers",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <IconGift className="w-4 h-4" />
        {translations("Loyalty")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                {totalCount > 0 ? (
                  <span>
                    {count.toLocaleString()} / {totalCount.toLocaleString()}
                  </span>
                ) : (
                  <span>{count.toLocaleString()}</span>
                )}
              </div>
              {totalCount > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                    {translations("remaining")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
