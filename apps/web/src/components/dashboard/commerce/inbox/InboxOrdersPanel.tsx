import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconSend } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  formatMoney,
  sendShopPaymentLink,
  type ShopOrderRow,
  type ShopPaymentStatus,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopOrders, useShopPayments } from "@/backend/commerce/shop.query";
import { useOrgModules } from "@/hooks/useOrgModules.ts";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { useOpenShopSettings } from "../shop/ShopUi.tsx";

const OPEN_PAYMENT: ShopPaymentStatus[] = ["UNPAID", "PENDING", "EXPIRED", "FAILED"];

/** An order still waiting on the customer: a cart they have not checked out, or a link not paid. */
const isOpenCart = (order: ShopOrderRow) =>
  order.status === "DRAFT" ||
  (order.status === "OPEN" && order.paymentStatus === "PENDING" && order.paymentMethod !== "cod");

/**
 * The contact's carts and orders, in the inbox's details panel. Live through the socket's
 * `shop_order` event, which refreshes every shop query.
 */
export function InboxOrdersPanel({ contactId }: Readonly<{ contactId: string }>) {
  const canRead = useCan("commerce.read");
  const { isOn } = useOrgModules();
  if (!canRead || !isOn("commerce")) return null;
  return <OrdersPanelBody contactId={contactId} />;
}

function OrdersPanelBody({ contactId }: Readonly<{ contactId: string }>) {
  const { t } = useTranslation();
  const canSell = useCan("commerce.sell");
  const all = useShopOrders({ contactId, limit: 10, tab: "all" });
  const drafts = useShopOrders({ contactId, limit: 5, tab: "drafts" });

  const loading = all.isPending || drafts.isPending;
  const seen = new Set<string>();
  const open = [...(drafts.data?.items ?? []), ...(all.data?.items ?? [])].filter((order) => {
    if (seen.has(order.id) || !isOpenCart(order)) return false;
    seen.add(order.id);
    return true;
  });
  const past = (all.data?.items ?? []).filter(
    (order) => !seen.has(order.id) && order.status !== "DRAFT",
  );

  if (!loading && !open.length && !past.length) return null;

  return (
    <div className="border-b border-border px-4 py-3.5">
      <div className="mb-2.5 flex min-h-5 items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{t("Orders")}</span>
        {all.data && all.data.total > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("{count, plural, one {# order} other {# orders}}", { count: all.data.total })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((order) => (
            <OpenCart key={order.id} order={order} canResend={canSell} />
          ))}
          {past.length > 0 && (
            <ul className="flex flex-col">
              {past.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/dashboard/commerce/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">#{order.number}</span>
                      <span className="text-muted-foreground">
                        {" · "}
                        {dayjs(order.placedAt ?? order.createdAt).format("MMM D")}
                        {" · "}
                        {formatMoney(order.total, order.currency)}
                      </span>
                    </span>
                    <OrderStatusBadge order={order} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OpenCart({ order, canResend }: Readonly<{ order: ShopOrderRow; canResend: boolean }>) {
  const { t } = useTranslation();
  const invalidateShop = useInvalidateShop();
  const { data: payments } = useShopPayments();
  const openSettings = useOpenShopSettings();
  const items = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Paid on the shop's own store checkout: the link resent is that checkout, never a payment link.
  const inStore = order.checkoutVia !== "RATEUP";
  const resend = useMutation({
    mutationFn: () => sendShopPaymentLink(order.id),
    onSuccess: (result) => {
      if (result.delivered)
        toast.success(inStore ? t("Checkout link sent") : t("Payment link sent"));
      else toast.error(result.deliveryError ?? t("The link couldn't be delivered in this chat."));
      void invalidateShop();
    },
    onError: (error) =>
      inStore || payments?.providers.some((p) => p.connected)
        ? toast.error(getApiErrorMessage(error, t("Couldn't send the payment link.")))
        : toast.error(t("Connect Stripe or Razorpay in Commerce → Settings → Getting paid"), {
            action: { label: t("Open Getting paid"), onClick: () => openSettings("payments") },
          }),
  });

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/dashboard/commerce/orders/$orderId"
          params={{ orderId: order.id }}
          className="text-[13px] font-semibold hover:underline"
        >
          {order.status === "DRAFT"
            ? t("Open cart")
            : t("Order #{number}", { number: order.number })}
        </Link>
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-500"
        >
          {order.paymentStatus === "EXPIRED" ? t("Link expired") : t("Not paid")}
        </Badge>
      </div>
      <div className="flex justify-between text-[13px]">
        <span className="text-muted-foreground">
          {t("{count, plural, one {# item} other {# items}}", { count: items })}
        </span>
        <span className="font-semibold tabular-nums">
          {formatMoney(order.total, order.currency)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{order.nextStep}</p>
      {canResend && (
        <Button
          size="xs"
          variant="outline"
          className="self-start"
          loading={resend.isPending}
          onClick={() => resend.mutate()}
        >
          <IconSend />
          {inStore
            ? t("Resend checkout link")
            : OPEN_PAYMENT.includes(order.paymentStatus) && order.paymentStatus !== "UNPAID"
              ? t("Resend link")
              : t("Send payment link")}
        </Button>
      )}
    </div>
  );
}

function OrderStatusBadge({ order }: Readonly<{ order: ShopOrderRow }>) {
  const { t } = useTranslation();
  let label: string;
  let tone: "good" | "warn" | "bad" | "muted" = "muted";

  if (order.status === "CANCELLED") {
    label = t("Cancelled");
    tone = "bad";
  } else if (order.paymentStatus === "REFUNDED") {
    label = t("Refunded");
  } else if (order.fulfillmentStatus === "DELIVERED") {
    label = t("Delivered");
    tone = "good";
  } else if (order.fulfillmentStatus === "FAILED_DELIVERY") {
    label = t("Delivery failed");
    tone = "bad";
  } else if (
    order.fulfillmentStatus === "SHIPPED" ||
    order.fulfillmentStatus === "OUT_FOR_DELIVERY"
  ) {
    label = t("Shipped");
  } else if (order.paymentStatus === "COD_PENDING") {
    label = t("Cash on delivery");
    tone = "warn";
  } else if (order.paymentStatus === "PAID") {
    label = t("Paid");
    tone = "good";
  } else {
    label = t("Not paid");
    tone = "warn";
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0",
        tone === "good" && "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
        tone === "warn" &&
          "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-500",
        tone === "bad" && "border-destructive/30 text-destructive",
      )}
    >
      {label}
    </Badge>
  );
}
