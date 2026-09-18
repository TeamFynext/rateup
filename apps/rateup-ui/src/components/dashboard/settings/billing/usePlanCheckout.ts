import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import type { ConversationAddonOrder, ICreateCheckoutType } from "@/backend/payment/payment.api";
import {
  useCreateCheckoutSession,
  useCreateConversationAddonOrder,
  useUserOrgOrders,
} from "@/backend/payment/payment.query";
import { useUser } from "@/context/UserContext.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { PaymentOrder } from "./types.ts";

function loadScript(src: string) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const RATEUP_LOGO = "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg";
const BRAND_COLOR = "#1C518E";

/** ~15s of polling: comfortably longer than a healthy webhook round-trip. */
const CONFIRMATION_POLL_ATTEMPTS = 10;
const CONFIRMATION_POLL_INTERVAL_MS = 1500;

/**
 * Everything to do with taking a payment: loading Razorpay, opening it against a subscription
 * or a one-off pack order, and waiting for the webhook to land. `isProcessing` only disables
 * the buttons that start a payment; the page keeps rendering its own content throughout.
 */
export function usePlanCheckout({ onSettled }: { onSettled: () => void }) {
  const { t: translations } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetch: refetchOrders } = useUserOrgOrders();

  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionOrder, setSubscriptionOrder] = useState<PaymentOrder | null>(null);

  const createCheckout = useCreateCheckoutSession(setIsStartingCheckout, setSubscriptionOrder);
  const createAddonOrder = useCreateConversationAddonOrder();

  /**
   * Razorpay confirms over webhooks that land a beat after the modal closes, so poll briefly
   * rather than write the status from the browser, which cannot see whether the charge settled.
   */
  async function awaitConfirmation(orderId?: string) {
    for (let attempt = 0; attempt < CONFIRMATION_POLL_ATTEMPTS; attempt++) {
      const { data } = await refetchOrders();
      const confirmed = data?.data?.find((order: PaymentOrder) => order.id === orderId);
      if (confirmed?.subscriptionStatus && confirmed.subscriptionStatus !== "none") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
    }
    // A pack lands as a SubscriptionAddon row, so the allowance has to be re-read too.
    queryClient.invalidateQueries({ queryKey: subscriptionKeys.conversationAddon() });
    onSettled();
  }

  /** Razorpay's subscription checkout, opened once the API has created the subscription. */
  async function openSubscriptionCheckout(order: PaymentOrder, rateupPlanId: string) {
    const loaded = await loadScript(RAZORPAY_SCRIPT);
    if (!loaded) {
      setIsProcessing(false);
      toast.error(translations("Razorpay failed to load. Check your connection and try again."));
      return;
    }

    const checkout = new window.Razorpay!({
      key: import.meta.env.VITE_RAZORPAY_API_KEY,
      subscription_id: order.subscriptionId,
      name: translations("RateUp Payment"),
      description: "Subscription Plans in Rateup",
      image: RATEUP_LOGO,
      handler: function () {
        setIsProcessing(false);
        void awaitConfirmation(order.id);
      },
      prefill: { name: user?.userName, email: user?.email, contact: user?.orgPhone },
      notes: {
        rateupOrderId: order.id,
        rateupPlanId,
        subId: order.subscriptionId,
        orgId: user?.orgId,
        subExpiry: dayjs.unix(Number(order.subExpiry)).format("YYYY-MM-DDTHH:mm:ss.sssZ"),
      },
      theme: { color: BRAND_COLOR },
      modal: { ondismiss: () => setIsProcessing(false) },
    });
    // `handler` fires only on success and `ondismiss` only on a manual close; without this a
    // declined card leaves the button spinning.
    checkout.on("payment.failed", function (response: RazorpayFailure) {
      setIsProcessing(false);
      toast.error(
        response?.error?.description ?? translations("Payment failed. Please try again."),
      );
    });
    checkout.open();
  }

  /**
   * Razorpay's one-off checkout, opened against `order_id`.
   *
   * `notes.rateupOrderId` is what the `payment.captured` webhook reads back to credit the
   * packs, so it has to match what the API stamped on the order.
   */
  async function openAddonCheckout(addonOrder: ConversationAddonOrder) {
    const loaded = await loadScript(RAZORPAY_SCRIPT);
    if (!loaded) {
      setIsProcessing(false);
      toast.error(translations("Razorpay failed to load. Check your connection and try again."));
      return;
    }

    const checkout = new window.Razorpay!({
      key: import.meta.env.VITE_RAZORPAY_API_KEY,
      order_id: addonOrder.gatewayOrderId,
      amount: addonOrder.amount * 100,
      currency: addonOrder.currency,
      name: translations("RateUp Payment"),
      description: addonOrder.planName,
      image: RATEUP_LOGO,
      handler: function () {
        setIsProcessing(false);
        void awaitConfirmation(addonOrder.rateupOrderId);
      },
      prefill: { name: user?.userName, email: user?.email, contact: user?.orgPhone },
      notes: {
        rateupOrderId: addonOrder.rateupOrderId,
        rateupPlanId: addonOrder.rateupPlanId,
        orgId: user?.orgId,
        addonQuantity: String(addonOrder.quantity),
      },
      theme: { color: BRAND_COLOR },
      modal: { ondismiss: () => setIsProcessing(false) },
    });
    checkout.on("payment.failed", function (response: RazorpayFailure) {
      setIsProcessing(false);
      toast.error(
        response?.error?.description ?? translations("Payment failed. Please try again."),
      );
    });
    checkout.open();
  }

  /** The API answers `createCheckout` with the order; that is the cue to open Razorpay. */
  const [pendingPlanId, setPendingPlanId] = useState("");
  useEffect(() => {
    if (subscriptionOrder?.subscriptionId && pendingPlanId) {
      void openSubscriptionCheckout(subscriptionOrder, pendingPlanId);
      setSubscriptionOrder(null);
    }
  }, [subscriptionOrder, pendingPlanId]);

  /** Starts a plan purchase. Stripe carts leave for the hosted checkout route instead. */
  function startPlanCheckout(
    details: ICreateCheckoutType,
    { gateway, priceId }: { gateway?: string; priceId?: string },
  ) {
    if (gateway === "STRIPE") {
      navigate({ to: `/dashboard/payment/checkout?pid=${priceId}` });
      return;
    }
    setIsProcessing(true);
    setPendingPlanId(details.rateupPlanId ?? "");
    createCheckout.mutate(details);
  }

  /**
   * Buys conversation packs — a one-off top-up, so Razorpay opens against an order, not a
   * subscription. Whether the org may buy at all is the API's call.
   */
  function startPackCheckout(quantity: number) {
    setIsProcessing(true);
    createAddonOrder.mutate(quantity, {
      onSuccess: (addonOrder) => void openAddonCheckout(addonOrder),
      onError: (error) => {
        setIsProcessing(false);
        toast.error(getApiErrorMessage(error, translations("Could not start the purchase")));
      },
    });
  }

  return { startPlanCheckout, startPackCheckout, isProcessing, isStartingCheckout };
}
