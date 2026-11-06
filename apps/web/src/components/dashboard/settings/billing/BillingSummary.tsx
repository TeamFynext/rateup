import { Badge } from "@rateup/ui/components/badge";
import { Card } from "@rateup/ui/components/card";
import { Progress } from "@rateup/ui/components/progress";
import {
  IconAlertTriangle,
  IconCalendarDollar,
  IconExternalLink,
  IconMessageCircle,
  IconSpeakerphone,
  IconSparkles,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { SubscriptionUsage } from "@/backend/subscription/subscription.api";
import { useSubscriptionUsage } from "@/backend/subscription/subscription.query";
import { isUnlimitedCount } from "@/components/HomePage/pages/Pricing/pricing.data.ts";
import { cn } from "@/lib/utils.ts";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import type { BillingData } from "./useBillingData.ts";
import { currencySymbol, formatAmount } from "./useBillingData.ts";

/**
 * The numbers a person opens this page to check: what plan they are on, what they owe next,
 * and how much of the two monthly allowances is left. Said once, here.
 */
export function BillingSummary({
  data,
  onJumpToUsage,
}: Readonly<{
  data: BillingData;
  onJumpToUsage: () => void;
}>) {
  const { data: usage } = useSubscriptionUsage();
  return (
    <Card size="sm" className="gap-0 divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
      <PlanCell data={data} />
      <ChargeCell data={data} />
      <AllowanceCells subscription={data.subscription} usage={usage} onClick={onJumpToUsage} />
    </Card>
  );
}

function Cell({
  label,
  icon,
  children,
  className,
}: Readonly<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("flex-1 space-y-1.5 px-(--card-spacing) py-1", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function statusBadge(state: BillingData["state"], t: (key: string) => string) {
  if (state.isProcessingPlan) return <Badge variant="secondary">{t("Processing")}</Badge>;
  if (state.isCancelled) return <Badge variant="secondary">{t("Cancelled")}</Badge>;
  if (state.isExpired && !state.isFreePlan)
    return <Badge variant="destructive">{t("Expired")}</Badge>;
  return <Badge>{t("Active")}</Badge>;
}

function PlanCell({ data }: Readonly<{ data: BillingData }>) {
  const { t } = useTranslation();
  const { subscription, cost, state } = data;

  function cadenceLine() {
    if (state.isShopifyPlan) return t("Billed through Shopify");
    if (state.isSalesLedPlan) return t("Managed by our team");
    if (state.isFreePlan) return t("No charge");
    if (!cost.cadence) return null;
    return cost.cadence === "year"
      ? `${t("Billed yearly")}${cost.currency ? ` · ${cost.currency}` : ""}`
      : `${t("Billed monthly")}${cost.currency ? ` · ${cost.currency}` : ""}`;
  }

  return (
    <Cell label={t("Plan")} icon={<IconSparkles className="size-3.5" />}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xl font-semibold leading-tight">
          {subscription?.basePlan?.displayName || t("No plan")}
        </span>
        {statusBadge(state, t)}
      </div>
      <p className="text-sm text-muted-foreground">{cadenceLine()}</p>
    </Cell>
  );
}

/**
 * What is owed next, and when. `subscriptionChargeAt` comes from the Razorpay webhooks, so it
 * is the gateway's own schedule rather than a date derived in the browser.
 */
function ChargeCell({ data }: Readonly<{ data: BillingData }>) {
  const { t } = useTranslation();
  const { activeOrder, cost, state } = data;

  const status = activeOrder?.subscriptionStatus;
  // halted/cancelled/completed all mean "no further charge is scheduled". `pending` means a
  // charge failed and Razorpay is retrying, which the customer needs to act on.
  const isRetrying = status === "pending";
  const hasEnded =
    state.isFreePlan ||
    state.isCancelled ||
    status === "completed" ||
    status === "halted" ||
    state.isExpired;

  const amount =
    typeof cost.amount === "number" || typeof cost.amount === "string"
      ? `${currencySymbol(cost.currency)}${formatAmount(cost.amount, cost.currency)}`
      : null;

  if (state.isShopifyPlan) {
    return (
      <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
        <a
          href="https://admin.shopify.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xl font-semibold text-primary hover:underline"
        >
          {t("In Shopify")}
          <IconExternalLink className="size-4" />
        </a>
        <p className="text-sm text-muted-foreground">
          {t("This subscription is billed by Shopify.")}
        </p>
      </Cell>
    );
  }

  if (state.isSalesLedPlan) {
    return (
      <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight">{t("By agreement")}</p>
        <p className="text-sm text-muted-foreground">
          {t("Invoiced directly —")}
          {""}
          <a href="mailto:hello@rateup.app" className="text-primary hover:underline">
            hello@rateup.app
          </a>
        </p>
      </Cell>
    );
  }

  if (isRetrying) {
    return (
      <Cell label={t("Next charge")} icon={<IconAlertTriangle className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight text-destructive">
          {t("Payment failed")}
        </p>
        <p className="text-sm text-destructive">
          {t("We are retrying it. Update your card if it keeps failing.")}
        </p>
      </Cell>
    );
  }

  if (state.isProcessingPlan) {
    return (
      <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight">{t("Confirming payment")}</p>
        <p className="text-sm text-muted-foreground">
          {t("This usually takes under a minute. Refresh to check again.")}
        </p>
      </Cell>
    );
  }

  if (hasEnded) {
    return (
      <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight">{t("None scheduled")}</p>
        <p className="text-sm text-muted-foreground">{endedReason(data, t)}</p>
      </Cell>
    );
  }

  const chargeAt = activeOrder?.subscriptionChargeAt;
  if (!chargeAt) {
    return (
      <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight">{t("Not scheduled yet")}</p>
        <p className="text-sm text-muted-foreground">
          {t("The next charge date appears once your subscription is confirmed.")}
        </p>
      </Cell>
    );
  }

  const daysAway = dayjs(chargeAt).startOf("day").diff(dayjs().startOf("day"), "day");
  let whenLabel = `${t("in")} ${daysAway} ${t("days")}`;
  if (daysAway === 0) whenLabel = t("today");
  else if (daysAway < 0) whenLabel = "";

  return (
    <Cell label={t("Next charge")} icon={<IconCalendarDollar className="size-3.5" />}>
      <p className="text-xl font-semibold leading-tight">
        {amount ?? t("Scheduled")}
        {amount && cost.cadence && (
          <span className="text-sm font-normal text-muted-foreground"> / {cost.cadence}</span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatIsoDateString(chargeAt)}
        {whenLabel && ` · ${whenLabel}`}
      </p>
    </Cell>
  );
}

/**
 * Cancelling stops the renewal, not the plan: the org keeps what it paid for until
 * `expiresAt`, and a nightly job moves it to Free after that. Said only here.
 */
function endedReason(data: BillingData, t: (key: string) => string) {
  const { state, subscription, activeOrder } = data;
  if (state.isFreePlan) return t("The free plan does not renew or expire.");
  if (subscription?.expiresAt) {
    const on = formatIsoDateString(subscription.expiresAt);
    return state.isExpired
      ? `${t("Ended on")} ${on} · ${t("now on the Free plan")}`
      : `${t("Runs until")} ${on}, ${t("then moves to the Free plan")}`;
  }
  if (activeOrder?.subscriptionEndedAt) {
    return `${t("Cancelled on")} ${formatIsoDateString(activeOrder.subscriptionEndedAt)}`;
  }
  return t("This subscription will not renew.");
}

function AllowanceCells({
  subscription,
  usage,
  onClick,
}: Readonly<{
  subscription: BillingData["subscription"];
  usage: SubscriptionUsage | undefined;
  onClick: () => void;
}>) {
  const { t } = useTranslation();

  if (!subscription?.features?.whatsapp?.active) {
    return (
      <Cell label={t("Active contacts")} icon={<IconMessageCircle className="size-3.5" />}>
        <p className="text-xl font-semibold leading-tight">{t("Not on this plan")}</p>
        <p className="text-sm text-muted-foreground">{t("WhatsApp is not part of your plan.")}</p>
      </Cell>
    );
  }

  const contacts = usage?.activeContacts;
  const credits = usage?.campaignCredits;
  const creditsLeft = credits?.remaining ?? 0;
  const creditsMax = Math.max(credits?.planMax ?? 0, (credits?.planUsed ?? 0) + creditsLeft);

  return (
    <>
      <AllowanceCell
        label={t("Active contacts")}
        icon={<IconMessageCircle className="size-3.5" />}
        metered={Boolean(contacts?.metered)}
        used={contacts?.used ?? 0}
        max={contacts?.max ?? 0}
        onClick={onClick}
      />
      <AllowanceCell
        label={t("Campaign credits")}
        icon={<IconSpeakerphone className="size-3.5" />}
        metered={Boolean(credits?.metered)}
        used={credits?.metered ? creditsMax - creditsLeft : (credits?.planUsed ?? 0)}
        max={creditsMax}
        onClick={onClick}
      />
    </>
  );
}

function AllowanceCell({
  label,
  icon,
  metered,
  used,
  max,
  onClick,
}: Readonly<{
  label: string;
  icon: React.ReactNode;
  metered: boolean;
  used: number;
  max: number;
  onClick: () => void;
}>) {
  const { t } = useTranslation();
  const capped = metered && max > 0 && !isUnlimitedCount(max);

  return (
    <Cell label={label} icon={icon}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <p className="text-xl font-semibold leading-tight tabular-nums">
          {used.toLocaleString()}
          {capped && (
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {max.toLocaleString()}
            </span>
          )}
        </p>
        {capped ? (
          <>
            <Progress
              value={Math.min((used / max) * 100, 100)}
              className="mt-2 gap-0"
              aria-label={label}
            />
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("{count} left · this month", {
                count: Math.max(max - used, 0).toLocaleString(),
              })}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {metered ? t("this month") : t("Unlimited on your plan")}
          </p>
        )}
      </button>
    </Cell>
  );
}
