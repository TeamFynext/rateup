import {
  IconAlertCircle,
  IconArrowsExchange,
  IconCircleCheck,
  IconExternalLink,
  IconMail,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import type { PaymentOrder } from "@/components/settings/billing-parts/shared.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

interface PlanCost {
  amount?: number | string;
  currency?: string;
  period?: string;
}

/**
 * The billing page's headline card: which plan the org is on, in what state, and the two
 * actions that change it.
 *
 * The next-charge date deliberately does not appear here — `UpcomingCharge` owns it, and
 * showing it twice was the main thing making the old card feel cluttered. This card
 * answers "what am I on and what can I do about it"; that one answers "what happens next".
 */
export function CurrentPlanCard({
  subscription,
  activeOrderData,
  cost,
  isFreePlan,
  isSalesLedPlan,
  isProcessingPlan,
  isShopifyPlan,
  onBuy,
  onChangePlan,
  onCancel,
}: {
  subscription?: Subscription;
  activeOrderData: PaymentOrder | null;
  cost: PlanCost | undefined;
  isFreePlan: boolean;
  /** Sold by conversation rather than billed by a gateway — Enterprise today. */
  isSalesLedPlan: boolean;
  isProcessingPlan: boolean;
  isShopifyPlan: boolean;
  /** Start a fresh subscription — free/expired/cancelled orgs have nothing to switch. */
  onBuy: () => void;
  /** Move a live subscription between tiers. */
  onChangePlan: () => void;
  onCancel: () => void;
}) {
  const { t: translations } = useTranslation();

  const status = activeOrderData?.subscriptionStatus;
  const isCancelled = status === "cancelled";
  const isExpired = checkExpiry(subscription?.expiresAt);
  // Only a live Razorpay subscription can be switched in place. Shopify bills in Shopify,
  // custom plans are sales-led, and a free/expired/cancelled org has nothing to move.
  const canChangePlan =
    !isFreePlan && !isSalesLedPlan && !isShopifyPlan && !isCancelled && !isProcessingPlan;

  function statusBadge() {
    if (isProcessingPlan) {
      return <Badge variant="secondary">{translations("Processing")}</Badge>;
    }
    if (isCancelled) {
      return (
        <Badge variant="secondary" className="gap-1">
          <IconX className="h-3 w-3" />
          {translations("Cancelled")}
        </Badge>
      );
    }
    if (isExpired && !isFreePlan) {
      return (
        <Badge variant="destructive" className="gap-1">
          <IconAlertCircle className="h-3 w-3" />
          {translations("Expired")}
        </Badge>
      );
    }
    return (
      <Badge className="gap-1">
        <IconCircleCheck className="h-3 w-3" />
        {translations("Active")}
      </Badge>
    );
  }

  function costLine() {
    if (isShopifyPlan) {
      return (
        <a
          href="https://admin.shopify.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {translations("Billed through Shopify")}
          <IconExternalLink className="h-3 w-3" />
        </a>
      );
    }
    if (isFreePlan) {
      return <p className="text-muted-foreground">{translations("No charge")}</p>;
    }
    if (cost?.amount === undefined) return null;

    const symbol = cost.currency === "INR" ? "₹" : "$";
    const amount =
      typeof cost.amount === "number"
        ? cost.amount.toLocaleString(cost.currency === "INR" ? "en-IN" : "en-US")
        : cost.amount;
    return (
      <p className="text-3xl font-semibold">
        {symbol}
        {amount}
        {cost.period && (
          <span className="text-base font-normal text-muted-foreground"> / {cost.period}</span>
        )}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-bold">
                {subscription?.basePlan?.displayName || translations("No Plan")}
              </h3>
              {statusBadge()}
            </div>
            {costLine()}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canChangePlan ? (
              <Button onClick={onChangePlan} className="gap-2">
                <IconArrowsExchange className="h-4 w-4" />
                {translations("Change plan")}
              </Button>
            ) : (
              !isShopifyPlan &&
              !isProcessingPlan && (
                <Button onClick={onBuy} className="gap-2">
                  <IconTrendingUp className="h-4 w-4" />
                  {isCancelled || isExpired
                    ? translations("Resubscribe")
                    : translations("Upgrade plan")}
                </Button>
              )
            )}
            {canChangePlan && (
              <Button variant="outline" onClick={onCancel} className="gap-2">
                <IconX className="h-4 w-4" />
                {translations("Cancel")}
              </Button>
            )}
          </div>
        </div>

        {isCancelled && (
          <>
            <Separator />
            <div className="space-y-1 text-sm text-muted-foreground">
              {activeOrderData?.subscriptionEndedAt && (
                <p>
                  {translations("Cancelled on")}{" "}
                  {formatIsoDateString(activeOrderData.subscriptionEndedAt)}.
                </p>
              )}
              {/* Cancelling stops the renewal, not the plan: the org keeps what it paid
                  for until `expiresAt`, and a nightly job moves it to Free after that
                  (`downgradeExpiredSubscriptions`). Saying only when it was cancelled left
                  the customer to guess whether they had lost access already. */}
              {subscription?.expiresAt && !isFreePlan && (
                <p>
                  {isExpired
                    ? `${translations("Your plan ended on")} ${formatIsoDateString(
                        subscription.expiresAt,
                      )} ${translations("and this organisation is moving to the Free plan.")}`
                    : `${translations("Your plan stays active until")} ${formatIsoDateString(
                        subscription.expiresAt,
                      )}, ${translations("after which this organisation moves to the Free plan.")}`}
                </p>
              )}
              <p>{translations("Resubscribe any time to pick up where you left off.")}</p>
            </div>
          </>
        )}

        {isSalesLedPlan && (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {translations("This plan is managed by our team")} —
              </span>
              <a
                href="mailto:hello@rateup.app"
                className="font-medium text-primary hover:underline"
              >
                hello@rateup.app
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
