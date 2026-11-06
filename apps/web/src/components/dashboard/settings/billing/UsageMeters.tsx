import { IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { useUsageStats } from "@/backend/stats/stats.query";
import type {
  ActiveContactBudget,
  CampaignCreditBudget,
} from "@/backend/subscription/subscription.api";
import { useSubscriptionUsage } from "@/backend/subscription/subscription.query";
import { isUnlimitedCount } from "@/components/HomePage/pages/Pricing/pricing.data.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

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
 * Every allowance on the plan, as one flat list. Each WhatsApp meter carries its packs offer
 * directly beneath it: the meter that fills up and the control that fixes it are one unit.
 */
export function UsageMeters({
  subscription,
  contactPacks,
  creditPacks,
}: Readonly<{
  subscription?: Subscription;
  contactPacks?: React.ReactNode;
  creditPacks?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const { data: stats, refetch, isFetching, isPending } = useUsageStats();
  const usageQuery = useSubscriptionUsage();
  const usage = usageQuery.data;
  const features = subscription?.features;
  const resetsOn = usage?.resetsAt ? dayjs(usage.resetsAt).format("D MMM YYYY") : null;

  if (isPending || usageQuery.isPending) {
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
            usageQuery.refetch();
          }}
          disabled={isFetching || usageQuery.isFetching}
        >
          <IconRefresh
            className={isFetching || usageQuery.isFetching ? "size-4 animate-spin" : "size-4"}
          />
          {t("Refresh")}
        </Button>
      </CardContent>

      <CardContent className="divide-y divide-border">
        {features?.whatsapp?.active && usage && (
          <>
            <ActiveContactMeter budget={usage.activeContacts} resetsOn={resetsOn}>
              {contactPacks}
            </ActiveContactMeter>
            <CampaignCreditMeter budget={usage.campaignCredits} resetsOn={resetsOn}>
              {creditPacks}
            </CampaignCreditMeter>
          </>
        )}

        {features?.whatsapp?.catalog?.active && usage?.shopOrders && (
          <UsageMeter
            label={t("Shop orders")}
            used={usage.shopOrders.used}
            max={usage.shopOrders.max ?? undefined}
            hint={t("Resets at the start of each month.")}
          />
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
          // A count, not an allowance: Meta bills AI usage directly, so nothing caps it here.
          <UsageMeter
            label={t("AI tokens")}
            used={(stats?.aiPromptTokensCount ?? 0) + (stats?.aiCompletionTokensCount ?? 0)}
            hint={t(
              "Used by survey summaries and Meta AI replies. Shown for your information; it doesn't count against your plan.",
            )}
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

function ActiveContactMeter({
  budget,
  resetsOn,
  children,
}: Readonly<{
  budget: ActiveContactBudget;
  resetsOn: string | null;
  children?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const addon = budget.addonContacts ?? 0;
  const definition = t(
    "Contacts you messaged or who messaged you this month. Broadcast-only contacts are free.",
  );

  return (
    <UsageMeter
      label={t("Active contacts")}
      used={budget.used}
      max={budget.metered ? budget.max : undefined}
      hint={
        <>
          {addon > 0
            ? t("{plan} from your plan + {packs} from packs.", {
                plan: (budget.planMax ?? 0).toLocaleString(),
                packs: addon.toLocaleString(),
              })
            : definition}
          {resetsOn && ` ${t("Resets {date}.", { date: resetsOn })}`}
        </>
      }
    >
      {children}
    </UsageMeter>
  );
}

/**
 * Plan credits are spent before packs, so the bar is plan + packs held, and the hint splits
 * what is left between the two.
 */
function CampaignCreditMeter({
  budget,
  resetsOn,
  children,
}: Readonly<{
  budget: CampaignCreditBudget;
  resetsOn: string | null;
  children?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const planMax = budget.planMax ?? 0;
  const planUsed = budget.planUsed ?? 0;
  const packRemaining = budget.packRemaining ?? 0;
  const remaining = budget.remaining ?? 0;
  const max = budget.metered ? Math.max(planMax, planUsed + remaining) : undefined;
  const used = max === undefined ? planUsed : max - remaining;

  return (
    <UsageMeter
      label={t("Campaign credits")}
      used={used}
      max={max}
      hint={
        <>
          {packRemaining > 0
            ? t("{plan} left from your plan + {packs} left in packs.", {
                plan: Math.max(planMax - planUsed, 0).toLocaleString(),
                packs: packRemaining.toLocaleString(),
              })
            : t("One credit per campaign message to one recipient.")}
          {resetsOn && ` ${t("Plan credits reset {date}.", { date: resetsOn })}`}
        </>
      }
    >
      {children}
    </UsageMeter>
  );
}
