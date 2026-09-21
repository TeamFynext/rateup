import { IconArrowDown, IconArrowUp, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useChangeSubscriptionPlan,
  useSubscriptionChangeOptions,
} from "@/backend/payment/payment.query";
import type { PricingPlan } from "@/components/HomePage/pages/Pricing/types.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

type Cadence = "monthly" | "yearly";

const SUPPORT_EMAIL = "hello@rateup.app";

function price(plan: PricingPlan, cadence: Cadence) {
  const amount = cadence === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  return typeof amount === "number" ? amount : Number(amount ?? 0);
}

/**
 * Switching a live subscription between tiers.
 *
 * Timing is not a choice offered to the customer — it follows the direction, and the
 * dialog says which applies before they commit:
 *
 *   - **Downgrade** takes effect at the end of the period they have already paid for.
 *   - **Upgrade** takes effect immediately — but only when the mandate allows a mid-cycle
 *     re-price. A card mandate is registered with the bank for a fixed amount, which
 *     nearly every Indian card subscription has, so upgrades usually land at renewal too.
 *     The dialog asks Razorpay which applies before labelling the buttons, rather than
 *     promising "now" and discovering otherwise after the click.
 *
 * Buying a plan from scratch is a different flow (it creates a subscription); this one
 * only moves an existing one, so it is shown solely to orgs that already have one.
 */
export function ChangePlanDialog({
  open,
  onOpenChange,
  plans,
  currentPlanId,
  currentCadence,
  renewsOn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PricingPlan[];
  currentPlanId: string | undefined;
  currentCadence: Cadence;
  renewsOn: string | undefined;
}) {
  const { t: translations } = useTranslation();
  const [cadence, setCadence] = useState<Cadence>(currentCadence);
  const changePlan = useChangeSubscriptionPlan();
  const { data: options, isPending: optionsPending } = useSubscriptionChangeOptions(open);

  const canChange = options?.canChange !== false;
  const immediateUpgrade = options?.canChangeImmediately ?? false;

  const current = plans.find((plan) => plan.id === currentPlanId);
  // Only tiers that are actually switchable: a tier with no gateway plan for this cadence
  // (Free, Enterprise) is sales-led and cannot be moved onto by API.
  const switchable = plans.filter((plan) =>
    cadence === "monthly" ? plan.monthlyPaymentPlan : plan.yearlyPaymentPlan,
  );

  function apply(plan: PricingPlan) {
    if (!plan.id) return;
    changePlan.mutate(
      { rateupPlanId: plan.id, period: cadence },
      {
        onSuccess: (result) => {
          toast.success(
            result.scheduleChangeAt === "now"
              ? `${translations("Switched to")} ${plan.displayName}`
              : `${plan.displayName} ${translations("starts when your current period ends")}`,
            result.deferredReason ? { description: result.deferredReason } : undefined,
          );
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, translations("Could not change your plan")), {
            // Razorpay's reasons (mandate rules, a concurrent change) are not things the
            // customer can act on alone, so every failure names someone who can help.
            description: `${translations("Write to")} ${SUPPORT_EMAIL} ${translations("and we will move you across.")}`,
          }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{translations("Change your plan")}</DialogTitle>
          <DialogDescription>
            {immediateUpgrade
              ? translations("Upgrades start right away. Downgrades start at your next renewal")
              : translations("Changes take effect at your next renewal")}
            {renewsOn ? ` (${renewsOn})` : ""}.
          </DialogDescription>
        </DialogHeader>

        {options?.reason && (
          <Alert>
            <IconInfoCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{options.reason}</p>
              {/* A bank mandate is fixed at the card's issuer, so there is nothing the
                  customer can toggle to make an upgrade land sooner. Support can move
                  them across by hand — without this they are left at a wall with no
                  next step. */}
              <p>
                {translations("Need the new plan sooner? Write to us at")}
                {""}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Plan change help")}`}
                  className="font-medium text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                {""}
                {translations("and we will sort it out with you.")}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {options?.hasScheduledChanges && (
          <Alert>
            <IconInfoCircle className="h-4 w-4" />
            <AlertDescription>
              {translations("A plan change is already scheduled for your next renewal.")}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2">
          {(["monthly", "yearly"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={cadence === option ? "default" : "outline"}
              onClick={() => setCadence(option)}
            >
              {option === "monthly" ? translations("Monthly") : translations("Yearly")}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          {switchable.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isDowngrade = price(plan, "yearly") < price(current ?? plan, "yearly");
            const amount = price(plan, cadence);

            return (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {plan.displayName}
                    {isCurrent && (
                      <Badge variant="secondary" className="gap-1">
                        <IconCheck className="h-3 w-3" />
                        {translations("Current")}
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.currency === "INR" ? "₹" : "$"}
                    {amount.toLocaleString(plan.currency === "INR" ? "en-IN" : "en-US")}
                    {" / "}
                    {cadence === "monthly" ? translations("month") : translations("year")}
                  </p>
                </div>

                {isCurrent ? (
                  <Button size="sm" variant="ghost" disabled>
                    {translations("Current plan")}
                  </Button>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      variant={isDowngrade ? "outline" : "default"}
                      disabled={changePlan.isPending || optionsPending || !canChange}
                      onClick={() => apply(plan)}
                      className="gap-1"
                    >
                      {isDowngrade ? (
                        <IconArrowDown className="h-4 w-4" />
                      ) : (
                        <IconArrowUp className="h-4 w-4" />
                      )}
                      {isDowngrade ? translations("Downgrade") : translations("Upgrade")}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {!isDowngrade && immediateUpgrade
                        ? translations("effective now")
                        : translations("at next renewal")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
