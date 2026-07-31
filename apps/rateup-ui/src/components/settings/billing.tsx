import {
  IconAlertCircle,
  IconCalendar,
  IconCircleCheck,
  IconClock,
  IconCurrencyDollar,
  IconInfoCircle,
  IconMail,
  IconPackage,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCancelRazorpaySubscriptionMutation } from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
import Pricing from "@/components/HomePage/pages/Pricing/index.tsx";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
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

  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [isProcessingPlan, setIsProcessingPlan] = useState(
    latestOrderData?.subscriptionStatus === "pending" || false,
  );
  const [isShopifyPlan, setIsShopifyPlan] = useState(false);
  const isFreePlan = useMemo(
    () => subscription && subscription?.basePlan?.name?.includes("FREE"),
    [subscription],
  );

  useEffect(() => {
    if (
      subscription?.basePlan?.name &&
      subscription.basePlan.name.toUpperCase().includes("CUSTOM")
    ) {
      setIsCustomPlan(true);
    } else {
      setIsCustomPlan(false);
    }
    if (subscription?.shopifyPlanId) setIsShopifyPlan(true);
    else setIsShopifyPlan(false);
  }, [subscription?.basePlan?.name]);

  useEffect(() => {
    setIsProcessingPlan(latestOrderData?.subscriptionStatus === "pending");
  }, [latestOrderData?.subscriptionStatus]);

  const CancelRazorpaySubscription = useCancelRazorpaySubscriptionMutation();
  const CancelStripeSubscription = useCancelStripeSubscriptionMutation();
  const { t: translations } = useTranslation();
  const navigate = useNavigate();

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

        {/* Main Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center justify-between w-full">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconPackage className="h-4 w-4" />
                    <span className="font-medium">{translations("Plan Name")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">
                      {subscription?.basePlan?.displayName || translations("No Plan")}
                    </h3>
                    {latestOrderData?.subscriptionStatus === "authenticated" && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        <IconSparkles className="h-3 w-3 mr-1" />
                        {translations("Trial Period")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  {subscription?.basePlan?.name === "RATEUP TRIAL" ||
                  (isFreePlan && !isCustomPlan && !isProcessingPlan) ? (
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/pricing",
                        })
                      }
                      className="gap-2"
                    >
                      <IconTrendingUp className="h-4 w-4" />
                      {translations("Upgrade plan")}
                    </Button>
                  ) : (
                    subscription?.basePlan?.name &&
                    (activeOrderData?.subscriptionStatus === "cancelled" && !isCustomPlan ? (
                      <Button disabled variant="secondary" className="gap-2">
                        <IconX className="h-4 w-4" />
                        {translations("Cancelled")}
                      </Button>
                    ) : (
                      !isCustomPlan &&
                      !isProcessingPlan &&
                      !isShopifyPlan && (
                        <Button
                          variant="destructive"
                          onClick={() => setCancelDialogOpened(true)}
                          className="gap-2"
                        >
                          <IconX className="h-4 w-4" />
                          {translations("Cancel Subscription")}
                        </Button>
                      )
                    ))
                  )}

                  {isCustomPlan && (
                    <Button onClick={() => setCustomUpgradeModal(true)} className="gap-2">
                      <IconTrendingUp className="h-4 w-4" />
                      {translations("Upgrade plan")}
                    </Button>
                  )}
                </div>
              </div>

              {activeOrderData?.subscriptionChargeAt &&
                activeOrderData?.subscriptionStatus !== "cancelled" &&
                !isCustomPlan && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <IconCalendar className="h-4 w-4" />
                      <span className="font-medium">{translations("Next Charging on")}:</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(activeOrderData?.subscriptionChargeAt)}
                    </p>
                  </div>
                )}

              {activeOrderData?.subscriptionStatus === "cancelled" &&
                activeOrderData?.subscriptionEndedAt &&
                !isCustomPlan && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <IconX className="h-4 w-4" />
                      <span className="font-medium">{translations("Cancelled on")}:</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(activeOrderData?.subscriptionEndedAt)}
                    </p>
                  </div>
                )}
            </div>

            <Separator />

            {/* Plan Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconClock className="h-4 w-4" />
                  <span className="font-medium">
                    {subscription?.basePlan?.paymentPlanId
                      ? translations("Next Due")
                      : translations("Validity")}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">
                    {isFreePlan ? "NA" : formatIsoDateString(subscription?.expiresAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={checkExpiry(subscription?.expiresAt) ? "destructive" : "default"}
                      className="gap-1"
                    >
                      {checkExpiry(subscription?.expiresAt) ? (
                        <>
                          <IconAlertCircle className="h-3 w-3" />
                          {translations("Expired")}
                        </>
                      ) : (
                        <>
                          <IconCircleCheck className="h-3 w-3" />
                          {translations("Active")}
                        </>
                      )}
                    </Badge>
                    {checkExpiry(subscription?.expiresAt) && !isProcessingPlan && (
                      <Button
                        size="sm"
                        onClick={() => setOpenedUpgradeModal(true)}
                        className="gap-1"
                      >
                        <IconTrendingUp className="h-3 w-3" />
                        {translations("Upgrade")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconCalendar className="h-4 w-4" />
                  <span className="font-medium">{translations("Billing Cycle")}</span>
                </div>
                <p className="text-base font-semibold">
                  {(subscription?.basePlan?.paymentPlan?.period ||
                    subscription?.basePlan?.stripeProduct?.interval) ??
                    (isShopifyPlan ? "Monthly" : "----")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconCurrencyDollar className="h-4 w-4" />
                  <span className="font-medium">{translations("Plan Cost")}</span>
                </div>
                {isShopifyPlan ? (
                  <a
                    href="https://admin.shopify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-2"
                  >
                    See in Shopify
                    <IconTrendingUp className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-base font-semibold">
                    {subscription?.basePlan?.paymentPlan?.amount
                      ? `${subscription?.basePlan?.paymentPlan?.currency} ${subscription.basePlan.paymentPlan.amount}`
                      : subscription?.basePlan?.stripeProduct?.amount
                        ? `$${subscription.basePlan.stripeProduct.amount}`
                        : "----"}
                  </p>
                )}
              </div>
            </div>

            {!isCustomPlan && !isProcessingPlan && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconPackage className="h-4 w-4" />
                      <span className="font-medium">{translations("Addons")}</span>
                    </div>
                    <p className="text-base font-semibold text-muted-foreground">
                      {translations("Nil")}
                    </p>
                  </div>
                  {!["FREE PLAN", "RATEUP TRIAL"].includes(subscription?.basePlan?.name ?? "") &&
                    activeOrderData?.subscriptionStatus === "cancelled" && (
                      <Button
                        onClick={() => setOpenedUpgradeModal(true)}
                        size="sm"
                        className="gap-2"
                      >
                        <IconTrendingUp className="h-4 w-4" />
                        {translations("Upgrade plan")}
                      </Button>
                    )}
                </div>
              </>
            )}

            <Separator />

            {/* Support Section */}
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {translations("*For Custom Plans / Support / Assistance")}
              </p>
              <div className="flex items-center gap-2">
                <IconMail className="h-4 w-4 text-muted-foreground" />
                <a
                  href="mailto:hello@rateup.app"
                  className="text-sm font-medium hover:underline text-primary"
                >
                  hello@rateup.app
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Upgrade Modal */}
      <Dialog open={openedUpgradeModal} onOpenChange={setOpenedUpgradeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTrendingUp className="h-5 w-5" />
              {translations("Upgrade Your Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Pricing isAccount={true} handleSelection={() => setOpenedUpgradeModal(false)} />
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
