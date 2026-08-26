// Extracted verbatim from the `/dashboard/settings/billing/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { IconCircleCheck, IconInfoCircle, IconRefresh, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { ConversationAddonOrder } from "@/backend/payment/payment.api";
import {
  useConversationAddonOffer,
  useCreateCheckoutSession,
  useCreateConversationAddonOrder,
  useOrgInvoices,
  useRateupPaymentsPlans,
  useUserOrgOrders,
} from "@/backend/payment/payment.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { BillingHistory } from "@/components/dashboard/settings/billing/BillingHistory.tsx";
import { ConversationPacks } from "@/components/dashboard/settings/billing/ConversationPacks.tsx";
import { PlanFeatures } from "@/components/dashboard/settings/billing/PlanFeatures.tsx";
import { UpcomingCharge } from "@/components/dashboard/settings/billing/UpcomingCharge.tsx";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import type { PricingGatewayPlan, PricingPlan } from "@/components/HomePage/pages/Pricing/types.ts";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import type { PaymentOrder } from "@/components/settings/billing-parts/shared.tsx";
import { UsageCard } from "@/components/settings/billing-parts/UsageCard.tsx";
import { Billing } from "@/components/settings/billing.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

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

/**
 * Razorpay stores a plan's period as "monthly"/"yearly"; those read awkwardly after a
 * price ("₹24,000 /yearly"). Map to the noun the cadence is actually charged in.
 */
function cadenceLabel(period: string | undefined) {
  if (period === "yearly" || period === "year") return "year";
  if (period === "monthly" || period === "month") return "month";
  return period ?? "";
}

/**
 * Formats a cart amount with thousands separators. en-IN gives the lakh grouping the
 * INR pricing copy uses (₹1,08,000); everything else gets en-US grouping. Enterprise
 * carries a string ("Lets Talk!") rather than a number, which passes through unchanged.
 */
function formatCartAmount(amount: string | number | undefined, currency: string | undefined) {
  if (amount === undefined || amount === null || amount === "") return "";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  return numeric.toLocaleString(currency === "INR" ? "en-IN" : "en-US");
}

/** ~15s of polling: comfortably longer than a healthy webhook round-trip. */
const CONFIRMATION_POLL_ATTEMPTS = 10;
const CONFIRMATION_POLL_INTERVAL_MS = 1500;

export function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const createCheckout = useCreateCheckoutSession(setIsLoading, setOrder);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const { data: subscription, refetch, isRefetching } = useSubscription();
  const {
    data: orders,
    refetch: refreshOrders,
    isRefetching: isRefetchOrders,
  } = useUserOrgOrders();
  const {
    data: invoices,
    isPending: invoicesPending,
    refetch: refreshInvoices,
    isRefetching: isRefetchInvoices,
  } = useOrgInvoices();
  const { data: catalogPlans } = useRateupPaymentsPlans();
  const { data: addonOffer, isPending: addonPending } = useConversationAddonOffer();
  const createAddonOrder = useCreateConversationAddonOrder();

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

  const formattedCartAmount = `${cart?.currencySymbol ?? ""}${formatCartAmount(
    cart?.amount,
    cart?.currency,
  )}`;
  // An annual plan is quoted as the yearly total, so show what that is per month —
  // the pricing page leads with the monthly figure and the two should reconcile.
  const monthlyEquivalent = useMemo(() => {
    const numeric = Number(cart?.amount);
    if (cadenceLabel(cart?.period) !== "year" || !Number.isFinite(numeric)) return null;
    return `${cart?.currencySymbol ?? ""}${formatCartAmount(
      Math.round(numeric / 12),
      cart?.currency,
    )}`;
  }, [cart?.amount, cart?.period, cart?.currency, cart?.currencySymbol]);
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
  };

  /**
   * Buys conversation packs.
   *
   * A pack is a one-off month-long top-up, so this opens Razorpay against an order rather
   * than a subscription — nothing renews and there is nothing to cancel afterwards.
   * Whether the org may buy at all is the API's call; a Free or Enterprise account is
   * refused there and the reason comes back as a toast.
   */
  function buyConversationPacks(quantity: number) {
    setProcessingPayment(true);
    createAddonOrder.mutate(quantity, {
      onSuccess: (addonOrder) => void openAddonCheckout(addonOrder),
      onError: (error) => {
        setProcessingPayment(false);
        toast.error(getApiErrorMessage(error, translations("Could not start the purchase")));
      },
    });
  }

  /**
   * Razorpay's one-off checkout, opened against `order_id`.
   *
   * `notes.rateupOrderId` is what the `payment.captured` webhook reads back to credit the
   * packs, so it has to match what the API stamped on the order.
   */
  async function openAddonCheckout(addonOrder: ConversationAddonOrder) {
    const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!loaded) {
      setProcessingPayment(false);
      toast.error(translations("Razropay failed to load!!"));
      return;
    }

    const checkout = new window.Razorpay!({
      key: import.meta.env.VITE_RAZORPAY_API_KEY,
      order_id: addonOrder.gatewayOrderId,
      amount: addonOrder.amount * 100,
      currency: addonOrder.currency,
      name: translations("RateUp Payment"),
      description: addonOrder.planName,
      image: "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg",
      handler: function (_response: unknown) {
        setProcessingPayment(false);
        void awaitOrderConfirmation(addonOrder.rateupOrderId);
      },
      prefill: { name: user?.userName, email: user?.email, contact: user?.orgPhone },
      notes: {
        rateupOrderId: addonOrder.rateupOrderId,
        rateupPlanId: addonOrder.rateupPlanId,
        orgId: user?.orgId,
        addonQuantity: String(addonOrder.quantity),
      },
      theme: { color: "#1C518E" },
      modal: { ondismiss: () => setProcessingPayment(false) },
    });
    checkout.on("payment.failed", function (response: RazorpayFailure) {
      setProcessingPayment(false);
      toast.error(
        response?.error?.description ?? translations("Payment failed. Please try again."),
      );
    });
    checkout.open();
  }

  /**
   * Razorpay confirms a subscription over the `subscription.charged` webhook, which lands
   * a beat after the modal closes.
   * A single refetch here usually still returns the pre-payment row, so poll briefly
   * rather than write the status from the browser — the client cannot see whether the
   * charge actually settled, and the user may close the tab before it would fire.
   */
  async function awaitOrderConfirmation(orderId?: string) {
    for (let attempt = 0; attempt < CONFIRMATION_POLL_ATTEMPTS; attempt++) {
      const { data } = await refreshOrders();
      const confirmed = data?.data?.find((o: PaymentOrder) => o.id === orderId);
      if (confirmed?.subscriptionStatus && confirmed.subscriptionStatus !== "none") {
        refetch();
        // A pack lands as a SubscriptionAddon row on the same webhook, so the card has to
        // be re-read too — the plan itself is unchanged and would otherwise look identical.
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.conversationAddon() });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
    }
    // The webhook may still be retrying; the manual refresh button is the way out.
    refetch();
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.conversationAddon() });
  }

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
          setProcessingPayment(false);
          void awaitOrderConfirmation(order.id);
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
      // `handler` only fires on success and `ondismiss` only on a manual close, so a
      // declined card would otherwise leave the button spinning with nothing said.
      paymentObject.on("payment.failed", function (response: RazorpayFailure) {
        setProcessingPayment(false);
        setselectedRateupPlan("");
        toast.error(
          response?.error?.description ?? translations("Payment failed. Please try again."),
        );
      });
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

  /** The catalog row behind the current subscription — the source of the feature bullets. */
  const currentPlan: PricingPlan | undefined = useMemo(
    () => catalogPlans?.find((p: PricingPlan) => p.id === subscription?.basePlan?.id),
    [catalogPlans, subscription?.basePlan?.id],
  );

  /**
   * Which cadence the org is actually billed on. A tier links a gateway plan per cadence,
   * so match the order's own `planId` against them — the annual price is the headline one
   * and would otherwise be shown to a monthly subscriber. Falls back to the legacy
   * single-cadence link, then to whichever cadence the tier does define.
   */
  const currentGatewayPlan: PricingGatewayPlan | undefined = useMemo(() => {
    const plan = currentPlan;
    if (!plan) return undefined;
    const byOrder = [plan.monthlyPaymentPlan, plan.yearlyPaymentPlan].find(
      (gateway) => gateway?.planId && gateway.planId === activeOrderData?.planId,
    );
    return (
      byOrder ?? plan.paymentPlan ?? plan.yearlyPaymentPlan ?? plan.monthlyPaymentPlan ?? undefined
    );
  }, [currentPlan, activeOrderData?.planId]);

  const isSubscriber = () => {
    return checkExpiry(subscription?.expiresAt) || subscription?.basePlan?.name === "FREE PLAN";
  };

  const enablePurchase = isSubscriber() || activeOrderData?.subscriptionStatus === "cancelled";

  function handleRefresh() {
    refetch();
    refreshOrders();
    refreshInvoices();
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingCharge
          isFreePlan={Boolean(subscription?.basePlan?.name?.includes("FREE"))}
          order={activeOrderData}
          amount={
            typeof currentGatewayPlan?.amount === "number" ? currentGatewayPlan.amount : undefined
          }
          currency={currentGatewayPlan?.currency ?? currentPlan?.currency}
          cadence={cadenceLabel(currentGatewayPlan?.period)}
        />
        <PlanFeatures plan={currentPlan} subscription={subscription} />
      </div>
      <UsageCard subscription={subscription} />
      <ConversationPacks
        offer={addonOffer}
        isPending={addonPending}
        onBuy={buyConversationPacks}
        isPurchasing={processingPayment}
      />
      <BillingHistory
        invoices={invoices}
        orders={orders?.data}
        isPending={invoicesPending}
        refresh={() => {
          refreshInvoices();
          refreshOrders();
        }}
        isRefetching={isRefetchInvoices || isRefetchOrders}
      />
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
        {/* sm:max-w-*, not max-w-*: DialogContent's base class is `sm:max-w-md`, which
            wins over an unprefixed max-w above 640px and squeezes the order summary. */}
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {enablePurchase
                ? translations("Confirm your order")
                : translations("Buy Rateup Premium")}
            </DialogTitle>
            {enablePurchase && (
              <DialogDescription>
                {translations("Review your plan before continuing to payment.")}
              </DialogDescription>
            )}
          </DialogHeader>

          {enablePurchase ? (
            <div className="grid gap-6 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              {/* Order summary — the numbers the customer is about to agree to. */}
              <div className="rounded-lg border border-border bg-muted/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {translations("Plan")}
                    </p>
                    <h3 className="text-xl font-bold leading-tight">{cart?.name}</h3>
                  </div>
                  {cart?.period && (
                    <Badge variant="secondary" className="capitalize">
                      {cadenceLabel(cart.period) === "year"
                        ? translations("Annual")
                        : translations("Monthly")}
                    </Badge>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight">{formattedCartAmount}</span>
                  <span className="text-sm text-muted-foreground">
                    /{cadenceLabel(cart?.period)}
                  </span>
                </div>
                {monthlyEquivalent && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {translations("Works out to")} {monthlyEquivalent} /{translations("month")}
                  </p>
                )}

                <Separator className="my-4" />

                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{translations("Due today")}</span>
                  <span className="font-semibold">{formattedCartAmount}</span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {translations(
                    "WhatsApp message charges are billed to your own Meta account and are not part of this total.",
                  )}
                </p>
              </div>

              {/* What the plan includes, plus the one choice this step actually offers. */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">{translations("What's included")}</h4>
                  <ul className="space-y-2">
                    {(cart?.description ?? []).map((item) => {
                      // A leading "-" marks a feature the plan does NOT include — the
                      // same convention the pricing cards use.
                      const excluded = item.startsWith("-");
                      return (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          {excluded ? (
                            <IconX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          )}
                          <span className={excluded ? "text-muted-foreground" : undefined}>
                            {excluded ? item.slice(1) : item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {cadenceLabel(cart?.period) === "year" && (
                  <Field
                    orientation="horizontal"
                    className="items-start gap-3 rounded-lg border border-border p-4"
                  >
                    <Switch
                      id="annual-limit"
                      checked={isAnnualMessageLimit}
                      onCheckedChange={setIsAnnualMessageLimit}
                      className="mt-0.5"
                    />
                    <FieldLabel htmlFor="annual-limit" className="cursor-pointer">
                      <span className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {translations("Pool my conversation allowance annually")}
                        </span>
                        <span className="text-xs font-normal leading-relaxed text-muted-foreground">
                          {translations(
                            "Spend the whole year's conversations whenever you like, instead of a fixed monthly cap.",
                          )}
                        </span>
                      </span>
                    </FieldLabel>
                  </Field>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-lg space-y-6 py-2">
              <Alert>
                <IconInfoCircle className="h-5 w-5" />
                <AlertDescription>
                  {translations(
                    "You already have an active plan, so you cannot buy a second one. To change tiers, use Change plan — or add conversation packs from the Conversation packs card below.",
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4">
                <h4 className="min-w-[140px] text-sm font-semibold">
                  {translations("Current Plan")}:
                </h4>
                <p className="text-sm text-muted-foreground">
                  {subscription?.basePlan?.displayName}
                </p>
              </div>

              <div className="flex justify-center pt-2">
                {/* The add-ons live in the Conversation packs card on this same page, so
                    this closes the dialog rather than opening a second purchase flow. */}
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    close();
                    reset();
                  }}
                >
                  {translations("See add-ons")}
                </Button>
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
