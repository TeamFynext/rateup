import { IconAlertTriangle, IconCalendarDollar, IconCheck } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { PaymentOrder } from "@/components/settings/billing-parts/shared.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card } from "@/components/ui/card.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

/**
 * What the customer will be charged next, and when.
 *
 * `subscriptionChargeAt` is written by the Razorpay webhooks (`subscription.charged`
 * carries the next `charge_at`), so this is Razorpay's own schedule rather than a date
 * derived client-side from the last payment.
 */
export function UpcomingCharge({
  order,
  amount,
  currency,
  cadence,
  isFreePlan,
  endsAt,
}: {
  order: PaymentOrder | null;
  amount?: number | string;
  currency?: string;
  cadence?: string;
  /** Free never charges — and an org returned to Free has no order to read either. */
  isFreePlan?: boolean;
  /**
   * The subscription's paid-through date. A cancelled plan keeps running until this
   * passes, so it — not the cancellation date — is what says whether access is over.
   */
  endsAt?: Date | string;
}) {
  const { t: translations } = useTranslation();

  const status = order?.subscriptionStatus;
  // halted/cancelled/completed all mean "no further charge is scheduled". `pending`
  // means a charge failed and Razorpay is retrying, which the customer needs to act on.
  const isEnded =
    isFreePlan || status === "cancelled" || status === "completed" || status === "halted";
  const isRetrying = status === "pending";
  const chargeAt = order?.subscriptionChargeAt;
  const hasEnded = endsAt ? dayjs().isAfter(dayjs(endsAt)) : undefined;
  const symbol = currency === "INR" ? "₹" : "$";
  const formattedAmount =
    typeof amount === "number" ? amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US") : "";

  function body() {
    if (isEnded) {
      return (
        <>
          <p className="text-2xl font-semibold">{translations("No upcoming charges")}</p>
          <p className="text-sm text-muted-foreground">
            {isFreePlan
              ? translations("The free plan does not renew or expire.")
              : // Cancelling only stops the renewal. Leading with the cancellation date
                // read as though the plan was already gone, when the customer still has
                // it until the date they paid through.
                endsAt
                ? hasEnded
                  ? `${translations("Your plan ended on")} ${formatIsoDateString(endsAt)} — ${translations("this organisation is moving to the Free plan.")}`
                  : `${translations("Your plan runs until")} ${formatIsoDateString(endsAt)}, ${translations("then moves to the Free plan.")}`
                : order?.subscriptionEndedAt
                  ? `${translations("Cancelled on")} ${formatIsoDateString(order.subscriptionEndedAt)}`
                  : translations("This subscription will not renew.")}
          </p>
        </>
      );
    }

    if (!chargeAt) {
      return (
        <>
          <p className="text-2xl font-semibold">{translations("Not scheduled yet")}</p>
          <p className="text-sm text-muted-foreground">
            {translations("The next charge date appears once your subscription is confirmed.")}
          </p>
        </>
      );
    }

    const daysAway = dayjs(chargeAt).startOf("day").diff(dayjs().startOf("day"), "day");
    return (
      <>
        <p className="text-2xl font-semibold">
          {formattedAmount ? `${symbol}${formattedAmount}` : translations("Scheduled")}
          {formattedAmount && cadence ? (
            <span className="text-sm font-normal text-muted-foreground"> / {cadence}</span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          {translations("Next charge on")} {formatIsoDateString(chargeAt)}
          {daysAway >= 0
            ? ` · ${daysAway === 0 ? translations("today") : `${translations("in")} ${daysAway} ${translations("days")}`}`
            : ""}
        </p>
      </>
    );
  }

  return (
    <Card className="p-6 gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2">
          <IconCalendarDollar className="h-4 w-4" />
          {translations("Upcoming Charge")}
        </h3>
        {isRetrying ? (
          <Badge variant="destructive" className="gap-1">
            <IconAlertTriangle className="h-3 w-3" />
            {translations("Payment retrying")}
          </Badge>
        ) : isEnded ? null : (
          <Badge variant="secondary" className="gap-1">
            <IconCheck className="h-3 w-3" />
            {translations("Active")}
          </Badge>
        )}
      </div>

      <div className="space-y-1">{body()}</div>

      {isRetrying && (
        <p className="text-sm text-destructive">
          {translations(
            "Your last payment did not go through. Razorpay will retry it — update your card if it keeps failing.",
          )}
        </p>
      )}
    </Card>
  );
}
