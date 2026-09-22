import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { ConversationAddonOffer } from "@/backend/payment/payment.api";
import type { UsageStats } from "@/backend/stats/stats.api";
import { useUsageStats } from "@/backend/stats/stats.query";
import { isUnlimitedCount } from "@/components/HomePage/pages/Pricing/pricing.data.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { aiAllowance, aiTokensUsed } from "@/hooks/usePlanStatus.ts";

/** One allowance: what it is, how much is gone, how much is left. Every meter uses this. */
export function UsageMeter({
  label,
  used,
  max,
  hint,
  children,
}: Readonly<{
  label: string;
  used: number;
  /** 0 or undefined means the allowance is not metered — the count is shown on its own. */
  max?: number;
  hint?: React.ReactNode;
  children?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const unlimited = isUnlimitedCount(max);
  const metered = Boolean(max && max > 0 && !unlimited);
  const overage = metered ? Math.max(used - (max ?? 0), 0) : 0;
  const percentage = metered ? Math.min((used / (max ?? 1)) * 100, 100) : 0;

  return (
    <div className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
          {metered
            ? `${Math.min(used, max ?? 0).toLocaleString()} / ${(max ?? 0).toLocaleString()}`
            : used.toLocaleString()}
          {unlimited && <Badge variant="secondary">{t("Unlimited")}</Badge>}
          {overage > 0 && (
            // Past the allowance both stop at full and the surplus is said separately; a bar
            // over 100% reads as a bug rather than as overage.
            <Badge
              variant="secondary"
              className="border border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-500"
            >
              +{overage.toLocaleString()} {t("over")}
            </Badge>
          )}
        </span>
      </div>

      {metered && (
        <Progress value={percentage} className="gap-0" aria-label={label}>
          <span className="sr-only">
            {percentage.toFixed(0)}% {t("used")}
          </span>
        </Progress>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/**
 * Every allowance on the plan, as one flat list.
 *
 * The conversation meter comes first and carries the packs offer directly beneath it: the
 * meter that fills up and the control that fixes it are one unit, rather than two cards with
 * the rest of the usage between them.
 */
export function UsageMeters({
  subscription,
  allowance,
  packs,
}: Readonly<{
  subscription?: Subscription;
  allowance?: ConversationAddonOffer["allowance"];
  /** The conversation-packs card, rendered under the conversation meter. */
  packs?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const { data: stats, refetch, isFetching, isPending } = useUsageStats();
  const features = subscription?.features;

  if (isPending) {
    return (
      <Card>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={`usage-skeleton-${index}`} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-medium">{t("Usage this period")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("What your plan allows, and how much of it you have used.")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <IconRefresh className={isFetching ? "size-4 animate-spin" : "size-4"} />
          {t("Refresh")}
        </Button>
      </CardContent>

      <CardContent className="divide-y divide-border">
        {features?.whatsapp?.active && (
          <ConversationMeter subscription={subscription} stats={stats} allowance={allowance}>
            {packs}
          </ConversationMeter>
        )}

        {features?.webSurvey?.active && (
          <UsageMeter
            label={t("Form submissions")}
            used={stats?.monthlySurveyResponses ?? 0}
            max={features.webSurvey?.count?.monthlyResponseLimit}
            hint={t("Resets at the start of each month.")}
          />
        )}

        <UsageMeter
          label={t("Teams")}
          used={stats?.teamsCount ?? 0}
          max={features?.team?.count?.max}
        />
        <UsageMeter
          label={t("Users")}
          used={stats?.teamMembersCount ?? 0}
          max={features?.team?.teamMember?.count?.max}
        />

        {features?.ai?.active && (
          <UsageMeter
            label={t("AI tokens")}
            used={aiTokensUsed(stats)}
            max={aiAllowance(features)}
            hint={t("Your AI chatbot and Meta AI replies share this allowance.")}
          />
        )}

        {features?.loyalty?.active && (
          <>
            <UsageMeter
              label={t("Loyalty customers")}
              used={stats?.loyaltyCustomerCount ?? 0}
              max={features.loyalty?.customer?.count?.max}
            />
            <UsageMeter
              label={t("Loyalty rewards")}
              used={stats?.loyaltyRewardCount ?? 0}
              max={features.loyalty?.reward?.count?.max}
            />
            <UsageMeter
              label={t("Loyalty actions")}
              used={stats?.loyaltyActionCount ?? 0}
              max={features.loyalty?.action?.count?.max}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ConversationMeter({
  subscription,
  stats,
  allowance,
  children,
}: Readonly<{
  subscription?: Subscription;
  stats: UsageStats | undefined;
  allowance?: ConversationAddonOffer["allowance"];
  children?: React.ReactNode;
}>) {
  const { t } = useTranslation();

  const isAnnual = Boolean(subscription?.isAnnualMessageLimit);
  // The METERED counters: self-derived 24h conversation windows, which is the unit the plan
  // allowance is enforced against. The inbox-ticket counters are analytics only.
  const used =
    (isAnnual ? stats?.annualMeteredConversationsCount : stats?.monthlyMeteredConversationsCount) ??
    0;
  const monthlyMax =
    allowance?.effectiveMax ?? subscription?.features?.whatsapp?.conversation?.count?.max ?? 0;
  const max = (isAnnual ? monthlyMax * 12 : monthlyMax) || 0;
  const addon = (allowance?.addonConversations ?? 0) * (isAnnual ? 12 : 1);
  const planTotal = max - addon;

  return (
    <UsageMeter
      label={isAnnual ? t("WhatsApp conversations (year)") : t("WhatsApp conversations")}
      used={used}
      max={max}
      hint={
        addon > 0
          ? `${planTotal.toLocaleString()} ${t("from your plan")} + ${addon.toLocaleString()} ${t(
              "from conversation packs",
            )}`
          : t("A conversation is a 24-hour window with one contact.")
      }
    >
      {children}
    </UsageMeter>
  );
}
