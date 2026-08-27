import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconMail,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCancelRazorpaySubscriptionMutation,
  useRateupPaymentsPlans,
} from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
import { ChangePlanDialog } from "@/components/dashboard/settings/billing/ChangePlanDialog.tsx";
import { CurrentPlanCard } from "@/components/dashboard/settings/billing/CurrentPlanCard.tsx";
import PricingSection from "@/components/HomePage/pages/Pricing/PricingSection.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import type { PaymentOrder } from "./billing-parts/shared.tsx";

/**
 * Resolves the gateway plan actually backing this subscription.
 *
 * The legacy catalog linked a single `paymentPlan`; the four-tier catalog links a
 * Razorpay plan per cadence and leaves `paymentPlan` null, so reading only the legacy
 * relation shows "----" for billing cycle and cost on every Starter and Pro org.
 *
 * When both cadences exist, the active order's amount disambiguates which one the org
 * is actually on — that is the figure they were charged, so it beats guessing. With no
 * order to match, annual wins because it is the default cadence.
 */
function resolveGatewayPlan(
  plan: SPlan | undefined,
  order: PaymentOrder | null,
): SPlanGatewayPlan | undefined {
  if (plan?.paymentPlan) return plan.paymentPlan;

  const candidates = [plan?.yearlyPaymentPlan, plan?.monthlyPaymentPlan].filter(
    (candidate): candidate is SPlanGatewayPlan => Boolean(candidate),
  );
  if (candidates.length === 0) return undefined;

  const matched =
    order?.amount != null
      ? candidates.find((candidate) => Number(candidate.amount) === Number(order.amount))
      : undefined;

  return matched ?? candidates[0];
}

export const Billing = ({
  subscription,
  activeOrderData,
  latestOrderData,
  processingPayment,
  refetch,
  refreshOrders,
  isRefetching,
}: {
  subscription?: Subscription;
  activeOrderData: PaymentOrder | null;
  latestOrderData: PaymentOrder | null;
  processingPayment: boolean;
  refetch: () => void;
  refreshOrders: () => void;
  isRefetching: boolean;
}) => {
  const [openedUpgradeModal, setOpenedUpgradeModal] = useState(false);
  const [customUpgradeModal, setCustomUpgradeModal] = useState(false);
  const [cancelResult, setCancelResult] = useState(false);
  const [cancelDialogOpened, setCancelDialogOpened] = useState(false);
  const [changePlanOpened, setChangePlanOpened] = useState(false);

  const [isProcessingPlan, setIsProcessingPlan] = useState(
    latestOrderData?.subscriptionStatus === "pending" || false,
  );
  const [isShopifyPlan, setIsShopifyPlan] = useState(false);
  const isFreePlan = useMemo(
    () => subscription && subscription?.basePlan?.name?.includes("FREE"),
    [subscription],
  );
  const gatewayPlan = useMemo(
    () => resolveGatewayPlan(subscription?.basePlan, activeOrderData),
    [subscription?.basePlan, activeOrderData],
  );
  // The upgrade dialog sells the same catalog the marketing page does. The previous
  // component filtered plans on the legacy `paymentPlan.period`/`currency`, which the
  // four-tier catalog leaves null (it links a plan per cadence instead) — so the dialog
  // listed nothing at all for Starter and Pro.
  const { data: plans, isPending: plansPending } = useRateupPaymentsPlans();

  /**
   * A tier sold by conversation rather than billed by a gateway — Enterprise today.
   *
   * Detected by the absence of any gateway plan, the same rule the API uses to decide
   * what may lapse (`GATEWAY_BILLED_PLAN`), rather than by matching the plan's name. The
   * old check looked for "CUSTOM" in the name, which matched a stray catalog row and
   * never matched Enterprise — so an Enterprise org was offered Change plan and Cancel
   * buttons for a subscription no gateway holds.
   */
  const isSalesLedPlan = useMemo(() => {
    const plan = subscription?.basePlan;
    if (!plan || isFreePlan) return false;
    return !(
      plan.paymentPlan ||
      plan.monthlyPaymentPlan ||
      plan.yearlyPaymentPlan ||
      plan.stripeProduct
    );
  }, [subscription?.basePlan, isFreePlan]);

  useEffect(() => {
    setIsShopifyPlan(Boolean(subscription?.shopifyPlanId));
  }, [subscription?.shopifyPlanId]);

  useEffect(() => {
    setIsProcessingPlan(latestOrderData?.subscriptionStatus === "pending");
  }, [latestOrderData?.subscriptionStatus]);

  const CancelRazorpaySubscription = useCancelRazorpaySubscriptionMutation();
  const CancelStripeSubscription = useCancelStripeSubscriptionMutation();
  const { t: translations } = useTranslation();

  const handleCancelSubscription = () => {
    toast.loading(translations("Hold.. your subscription is getting cancelled..."), {
      id: "load-data",
    });

    if (subscription?.basePlan?.stripeProduct) {
      CancelStripeSubscription.mutate(undefined, {
        onSuccess: (_r) => {
          setCancelResult(true);
          setCancelDialogOpened(false);
        },
      });
    } else {
      CancelRazorpaySubscription.mutate(undefined, {
        onSuccess: (_r) => {
          setCancelResult(true);
          setCancelDialogOpened(false);
        },
      });
    }
  };

  function handleRefresh() {
    refetch();
    refreshOrders();
  }

  if (processingPayment) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center">
        <p>{translations("Processing")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Processing Plan Alert */}
        {isProcessingPlan && (
          <Alert className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100/50">
            <IconInfoCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription>
              <div className="flex items-center justify-between gap-4 ml-2">
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900">
                    {translations("Your plan activation is under process.")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {translations("You will receive activation status via email shortly.")}
                  </p>
                  <p className="text-xs text-blue-700">
                    {translations("Usually takes between 30seconds to 15 mins.")}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  variant="outline"
                  className="shrink-0 border-blue-300 hover:bg-blue-50"
                >
                  <IconRefresh className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                  {translations("Refresh Status")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <CurrentPlanCard
          subscription={subscription}
          activeOrderData={activeOrderData}
          cost={{
            amount: gatewayPlan?.amount ?? subscription?.basePlan?.stripeProduct?.amount,
            currency: gatewayPlan?.currency ?? subscription?.basePlan?.stripeProduct?.currency,
            period: gatewayPlan?.period ?? subscription?.basePlan?.stripeProduct?.interval,
          }}
          isFreePlan={Boolean(isFreePlan)}
          isSalesLedPlan={isSalesLedPlan}
          isProcessingPlan={isProcessingPlan}
          isShopifyPlan={isShopifyPlan}
          onBuy={() => (isSalesLedPlan ? setCustomUpgradeModal(true) : setOpenedUpgradeModal(true))}
          onChangePlan={() => setChangePlanOpened(true)}
          onCancel={() => setCancelDialogOpened(true)}
        />
      </div>
      <ChangePlanDialog
        open={changePlanOpened}
        onOpenChange={setChangePlanOpened}
        plans={plans ?? []}
        currentPlanId={subscription?.basePlan?.id}
        currentCadence={gatewayPlan?.period === "monthly" ? "monthly" : "yearly"}
        renewsOn={
          activeOrderData?.subscriptionChargeAt
            ? formatIsoDateString(activeOrderData.subscriptionChargeAt)
            : undefined
        }
      />
      {/* Upgrade Modal */}
      <Dialog open={openedUpgradeModal} onOpenChange={setOpenedUpgradeModal}>
        {/* sm:max-w-*, not max-w-*: DialogContent's own base class is `sm:max-w-md`, so an
            unprefixed max-w never wins above 640px and the dialog stays 28rem wide. Wide
            enough for the four plan cards to sit in one row on desktop. */}
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTrendingUp className="h-5 w-5" />
              {translations("Upgrade Your Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {plansPending ? (
              <RateupLoader />
            ) : (
              <PricingSection
                plans={plans ?? []}
                variant="compact"
                // Deliberately not passing `currentPlanName`. It narrows the cards to
                // tiers *above* the current one, which is right for an active subscriber
                // upgrading — but this dialog is the resubscribe path, reached only when
                // the plan is cancelled, lapsed or free. Passing it left a cancelled Pro
                // customer looking at Enterprise as their only option, unable to come
                // back on Pro or move down to Starter. Someone with a live subscription
                // changes tier through ChangePlanDialog, which offers both directions.
                onPlanSelect={() => setOpenedUpgradeModal(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Result Modal */}
      <Dialog open={cancelResult} onOpenChange={setCancelResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCircleCheck className="h-5 w-5 text-green-600" />
              {translations("Subscription Cancelled !")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {translations("Your current Rateup plan subscription is successfully cancelled.")}
              </p>
              <p>
                {translations(
                  "You can still enjoy the premium features until the validity expires.",
                )}
              </p>
              <p>
                {translations(
                  "Also your existing base plan benefits will be replaced on an upgrade.",
                )}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{translations("Need help")}?</span>
              <a
                href="mailto:hello@rateup.app"
                className="text-sm font-medium hover:underline text-primary"
              >
                hello@rateup.app
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Custom Upgrade Modal */}
      <Dialog open={customUpgradeModal} onOpenChange={setCustomUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-amber-500" />
              {translations("Upgrade Custom Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{translations("For Upgrading your Custom Plan,")}</p>
              <p>{translations("Connect Rateup billing team via email.")}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <IconMail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{translations("Contact us at")}</span>
              <a
                href="mailto:hello@rateup.app"
                className="text-sm font-medium hover:underline text-primary"
              >
                hello@rateup.app
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpened} onOpenChange={setCancelDialogOpened}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertCircle className="h-5 w-5 text-destructive" />
              {translations("Cancel Subscription")}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {translations("Are you sure you want to cancel your active subscription")}?{" "}
              {translations(
                "You will lose access to premium features once the current billing period ends",
              )}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpened(false)}>
              {translations("Close")}
            </Button>
            <Button onClick={handleCancelSubscription} variant="destructive">
              {translations("Confirm Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
