// Extracted verbatim from the `/dashboard/settings/billing/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconCircleCheck, IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateCheckoutSession,
  useUpdateSubscriptionOrder,
  useUserOrgOrders,
} from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { generateListItems } from "@/components/HomePage/pages/Pricing/Card/PricingCard.tsx";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import { OrderHistory } from "@/components/settings/billing-parts/OrderHistory.tsx";
import type { PaymentOrder } from "@/components/settings/billing-parts/shared.tsx";
import { UsageCard } from "@/components/settings/billing-parts/UsageCard.tsx";
import { Billing } from "@/components/settings/billing.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useUser } from "@/context/UserContext.tsx";

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const createCheckout = useCreateCheckoutSession(setIsLoading, setOrder);
  const { user } = useUser();
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const { data: subscription, refetch, isRefetching } = useSubscription();
  const {
    data: orders,
    refetch: refreshOrders,
    isRefetching: isRefetchOrders,
  } = useUserOrgOrders();
  const updateOrderMut = useUpdateSubscriptionOrder(order?.id ?? "");

  const [activeOrderData, setActiveOrderData] = useState<PaymentOrder | null>(null);
  const [latestOrderData, setLatestOrderData] = useState<PaymentOrder | null>(null);

  const [isAnnualMessageLimit, setIsAnnualMessageLimit] = useState(false);

  useEffect(() => {
    const order = orders?.data?.filter(
      (o: { subscriptionId?: string }) => o.subscriptionId === subscription?.subscriptionRef,
    );
    if (order && order.length > 0) setActiveOrderData(order[0]);

    const sorted = orders?.data?.sort(
      (a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (sorted && sorted.length) setLatestOrderData(sorted[0]);
  }, [subscription, orders]);

  const [opened, setOpened] = useState(false);
  const [summaryView, setSummaryView] = useState(false);

  // Modal control functions
  const open = () => setOpened(true);
  const close = () => setOpened(false);

  const closeSummary = () => setSummaryView(false);

  const { cart, reset } = useRouteAndCartStore();
  const [selectedRateupPlan, setselectedRateupPlan] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  // data to be recevied from pricing page

  const checkoutDetails = {
    planId: cart?.planId,
    rateupPlanId: cart?.id,
    planName: cart?.name,
    period: cart?.period,
    orgId: user?.orgId,
    isAnnualMessageLimit,
    trialDays: cart?.trialDays,
  };

  async function displayRazorpay() {
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

    if (!res) {
      alert(translations("Razropay failed to load!!"));
      return;
    }

    if (order?.subscriptionId && selectedRateupPlan) {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_API_KEY,
        subscription_id: order?.subscriptionId,
        name: translations("RateUp Payment"),
        description: "Subscription Plans in Rateup",
        image: "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg",
        handler: function (_response: unknown) {
          console.log(translations("Payment Successful...!"));
          setProcessingPayment(false);
          if (order.hasTrial) {
            updateOrderMut.mutate({
              status: "COMPLETE",
              paymentStatus: "SUCCESS",
              subscriptionStatus: "authenticated",
            });
          } else {
            refreshOrders();
          }
          // alert("Payment Successful!");
        },
        prefill: {
          name: user?.userName,
          email: user?.email,
          contact: user?.orgPhone,
        },
        notes: {
          rateupOrderId: order?.id,
          rateupPlanId: selectedRateupPlan,
          subId: order?.subscriptionId,
          orgId: user?.orgId,
          subExpiry: dayjs.unix(Number(order?.subExpiry)).format("YYYY-MM-DDTHH:mm:ss.sssZ"),
        },
        theme: {
          color: "#1C518E",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setselectedRateupPlan("");
          },
        },
      };

      const paymentObject = new window.Razorpay!(options);
      paymentObject.open();
    }
  }

  useEffect(() => {
    if (order) {
      displayRazorpay();
    }
  }, [order]);

  useEffect(() => {
    if (cart.id) {
      setselectedRateupPlan(cart?.id);
      open();
    }
  }, [cart.id]);

  const isSubscriber = () => {
    return (
      checkExpiry(subscription?.expiresAt) ||
      subscription?.basePlan?.name === "RATEUP TRIAL" ||
      subscription?.basePlan?.name === "FREE PLAN"
    );
  };

  const enablePurchase = isSubscriber() || activeOrderData?.subscriptionStatus === "cancelled";

  function handleRefresh() {
    refetch();
    refreshOrders();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full flex items-center justify-between">
        <div>
          <h2 className="text-2xl">{translations("Billing & Subscription")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations("Manage your subscription plan and payment methods")}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Button
            onClick={handleRefresh}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <IconRefresh className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            {translations("Refresh")}
          </Button>
        </div>
      </div>
      <Billing
        subscription={subscription}
        activeOrderData={activeOrderData}
        latestOrderData={latestOrderData}
        processingPayment={processingPayment}
        refetch={refetch}
        refreshOrders={refreshOrders}
        isRefetching={isRefetching}
      />
      <UsageCard subscription={subscription} />
      <OrderHistory orders={orders?.data} refresh={refreshOrders} isRefetching={isRefetchOrders} />
      {/* Order Confirmation Modal */}
      <Dialog
        open={opened}
        onOpenChange={(open) => {
          if (!open) {
            close();
            reset();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {enablePurchase
                ? translations("Confirm your Order")
                : translations("Buy Rateup Premium")}
            </DialogTitle>
          </DialogHeader>

          {enablePurchase ? (
            <div className="py-6">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                {/* Plan Details Section */}
                <div className="space-y-4 shrink-0">
                  {cart?.period === "yearly" && (
                    <Field orientation="horizontal" className="gap-2">
                      <Switch
                        id="annual-limit"
                        checked={isAnnualMessageLimit}
                        onCheckedChange={setIsAnnualMessageLimit}
                      />
                      <FieldLabel htmlFor="annual-limit" className="cursor-pointer">
                        {translations("Annual Message limit")}
                      </FieldLabel>
                    </Field>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">{cart?.name}</h3>
                    <p className="text-xl font-semibold text-muted-foreground">
                      {cart?.currencySymbol}
                      {cart?.amount} <span className="text-base">/{cart?.period}</span>
                    </p>
                  </div>
                </div>

                {/* Features Section */}
                <div className="space-y-4 flex-1">
                  <h4 className="text-lg font-semibold">{translations("Plan Features")}</h4>
                  <div className="space-y-2">
                    {cart?.description && generateListItems(cart?.description)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 max-w-lg space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <IconInfoCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="ml-2">
                  <p className="text-sm text-blue-900">
                    {translations(
                      "You have an active Base Plan already. So you cannot buy another Rateup base plan. But you can buy the available ADDON RateUp plan to get more features.",
                    )}
                  </p>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4 px-4">
                <h4 className="text-lg font-semibold min-w-[140px]">
                  {translations("Current Plan")}:
                </h4>
                <p className="text-base text-muted-foreground">
                  {subscription?.basePlan?.displayName}
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button className="w-full sm:w-auto">{translations("Buy Addons")}</Button>
              </div>
            </div>
          )}

          {enablePurchase && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  close();
                  reset();
                }}
                disabled={isLoading}
              >
                {translations("Cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (cart.gateway === "STRIPE") {
                    close();
                    navigate({
                      to: `/dashboard/payment/checkout?pid=${cart.priceId}`,
                    });
                  } else {
                    setProcessingPayment(true);
                    createCheckout.mutate(checkoutDetails, {
                      onSettled: (_data) => {
                        setIsAnnualMessageLimit(false);
                      },
                    });
                    close();
                    reset();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <IconRefresh className="mr-2 h-4 w-4 animate-spin" />
                    {translations("Processing")}
                  </>
                ) : (
                  translations("Continue to Payment")
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {/* order summary */}
      <Dialog
        open={summaryView}
        onOpenChange={(open) => {
          if (!open) {
            closeSummary();
            reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <IconCircleCheck className="h-6 w-6 text-green-600" />
              {translations("Order Processing Started")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-4 min-w-[350px]">
            <div className="space-y-4">
              <p className="text-green-600 font-semibold text-lg">
                {translations("Your payment was successful..!")}
              </p>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{translations("Thank you for choosing Rateup Premium subscription.")}</p>
                <p>
                  {translations(
                    "You can enjoy Rateup Premium features once your order is processed successfully.",
                  )}
                </p>
                <p>{translations("You will be notified by email shortly.")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                closeSummary();
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {translations("Continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
