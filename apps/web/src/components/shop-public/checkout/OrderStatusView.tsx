import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconCircleCheckFilled,
  IconExternalLink,
  IconFileInvoice,
  IconReceiptRefund,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatMoney,
  publicInvoiceUrl,
  type PublicCheckout,
  type ShopBankDetails,
  type ShopFulfillmentStatus,
  type ShopPaymentStatus,
} from "@/backend/commerce/shop.api";
import { cn } from "@/lib/utils.ts";
import { safeHref } from "@/utils/safeHref.ts";

import { MessageShopButton } from "../shared.tsx";
import { AddressBlock, CheckoutSection, OrderLines, OrderTotals } from "./OrderParts.tsx";
import { ReturnDialog } from "./ReturnDialog.tsx";

const STEP_INDEX: Record<ShopFulfillmentStatus, number> = {
  UNFULFILLED: 0,
  PACKED: 1,
  SHIPPED: 2,
  OUT_FOR_DELIVERY: 2,
  FAILED_DELIVERY: 2,
  DELIVERED: 3,
  RETURNED: 3,
  CANCELLED: 0,
};

const RETURNABLE: ShopFulfillmentStatus[] = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

interface Props {
  token: string;
  checkout: PublicCheckout;
  /** From the placing call, so they show before the page's own query has refetched. */
  bankDetails: ShopBankDetails | null;
}

export function OrderStatusView({ token, checkout, bankDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const { order, store } = checkout;
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSent, setReturnSent] = useState(false);
  const returnOpenAlready = returnSent || Boolean(order.returnRequested);
  const cancelled = order.status === "CANCELLED";
  const awaitingConfirmation = !cancelled && Boolean(order.awaitingConfirmation);
  const step = STEP_INDEX[order.fulfillmentStatus];
  const steps = [t("Placed"), t("Packed"), t("Shipped"), t("Delivered")];
  const firstName = order.customerName?.split(" ")[0];

  return (
    <div className="flex flex-col gap-3">
      <CheckoutSection>
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          {cancelled ? (
            <IconAlertTriangle className="size-10 text-destructive" />
          ) : awaitingConfirmation ? (
            <IconBrandWhatsapp className="size-10 text-amber-600 dark:text-amber-500" />
          ) : (
            <IconCircleCheckFilled className="size-10 text-green-600" />
          )}
          <h1 className="font-display text-xl font-extrabold">
            {cancelled
              ? t("Order #{number} was cancelled", { number: order.number })
              : awaitingConfirmation
                ? t("Order #{number} is placed. Confirm it on WhatsApp", { number: order.number })
                : firstName
                  ? t("Thanks, {name}! Order #{number} is confirmed", {
                      name: firstName,
                      number: order.number,
                    })
                  : t("Thanks! Order #{number} is confirmed", { number: order.number })}
          </h1>
          {order.placedAt && (
            <p className="text-sm text-muted-foreground">
              {t("Placed {date}", { date: dayjs(order.placedAt).format("MMM D, YYYY · h:mm A") })}
            </p>
          )}
          <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
          {awaitingConfirmation && (
            <p className="text-sm">
              {t(
                "{store} sent you a WhatsApp message. Tap Confirm order there and they'll start packing.",
                { store: store.name },
              )}
            </p>
          )}
        </div>
      </CheckoutSection>

      {bankDetails && order.paymentStatus !== "PAID" && (
        <BankDetails details={bankDetails} total={order.total} currency={order.currency} />
      )}

      {!cancelled && (
        <CheckoutSection title={t("Progress")}>
          <ol className="grid grid-cols-4 gap-1">
            {steps.map((label, index) => {
              const done = index <= step;
              return (
                <li key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <span className="flex w-full items-center">
                    <span
                      className={cn(
                        "h-0.5 flex-1",
                        index === 0 ? "invisible" : done ? "bg-primary" : "bg-border",
                      )}
                    />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <IconCheck className="size-4" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        "h-0.5 flex-1",
                        index === steps.length - 1
                          ? "invisible"
                          : index < step
                            ? "bg-primary"
                            : "bg-border",
                      )}
                    />
                  </span>
                  <span className={cn("text-xs", done ? "font-semibold" : "text-muted-foreground")}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          {order.fulfillmentStatus === "OUT_FOR_DELIVERY" && (
            <p className="text-sm font-semibold">{t("Out for delivery today.")}</p>
          )}
          {order.fulfillmentStatus === "FAILED_DELIVERY" && (
            <Alert variant="destructive">
              <AlertDescription>
                {t(
                  "The courier couldn't deliver your order. We'll be in touch to arrange another try.",
                )}
              </AlertDescription>
            </Alert>
          )}
          {order.fulfillmentStatus === "RETURNED" && (
            <p className="text-sm text-muted-foreground">{t("This order was returned.")}</p>
          )}
          {order.tracking && safeHref(order.tracking.trackingUrl) && (
            <Button
              variant="outline"
              className="self-start"
              render={
                <a href={safeHref(order.tracking.trackingUrl)} target="_blank" rel="noreferrer" />
              }
            >
              <IconExternalLink />
              {order.tracking.carrier
                ? t("Track with {carrier}", { carrier: order.tracking.carrier })
                : t("Track your parcel")}
            </Button>
          )}
        </CheckoutSection>
      )}

      <CheckoutSection title={t("Items")}>
        <OrderLines order={order} />
        <OrderTotals order={order} className="border-t border-border pt-3" />
      </CheckoutSection>

      {order.shippingAddress?.line1 && (
        <CheckoutSection title={t("Delivering to")}>
          <AddressBlock address={order.shippingAddress} />
          {order.shippingRate && (
            <p className="text-sm text-muted-foreground">{order.shippingRate.name}</p>
          )}
        </CheckoutSection>
      )}

      <div className="flex flex-wrap gap-2">
        {checkout.invoiceAvailable && (
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            render={<a href={publicInvoiceUrl(token)} target="_blank" rel="noreferrer" />}
          >
            <IconFileInvoice />
            {t("Download invoice")}
          </Button>
        )}
        <MessageShopButton
          whatsappNumber={store.whatsappNumber}
          text={t("Hi {store}, I have a question about my order #{number}.", {
            store: store.name,
            number: order.number,
          })}
        />
        {RETURNABLE.includes(order.fulfillmentStatus) && !returnOpenAlready && (
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setReturnOpen(true)}>
            <IconReceiptRefund />
            {t("Request a return")}
          </Button>
        )}
        {store.storefrontEnabled && (
          <Button
            variant="ghost"
            className="h-11 rounded-xl"
            render={<Link to="/s/$slug" params={{ slug: store.slug }} search={{}} />}
          >
            {t("Back to the shop")}
          </Button>
        )}
      </div>
      {returnOpenAlready && (
        <Alert>
          <IconCheck className="text-green-600" />
          <AlertTitle>{t("Return requested")}</AlertTitle>
          <AlertDescription>
            {t("{store} will message you with the next steps.", { store: store.name })}
          </AlertDescription>
        </Alert>
      )}

      <ReturnDialog
        token={token}
        order={order}
        open={returnOpen}
        onOpenChange={setReturnOpen}
        onSent={() => {
          setReturnOpen(false);
          setReturnSent(true);
        }}
      />
    </div>
  );
}

function PaymentBadge({
  status,
  method,
}: Readonly<{ status: ShopPaymentStatus; method: string | null }>) {
  const { t } = useTranslation();
  const label: Record<ShopPaymentStatus, string> = {
    PAID: t("Paid"),
    PENDING: t("Payment processing"),
    UNPAID: method === "bank" ? t("Awaiting bank transfer") : t("Not paid yet"),
    COD_PENDING: t("Pay on delivery"),
    PARTIALLY_REFUNDED: t("Partly refunded"),
    REFUNDED: t("Refunded"),
    FAILED: t("Payment failed"),
    EXPIRED: t("Payment link expired"),
  };
  const good = status === "PAID";
  return (
    <Badge
      variant="outline"
      className={cn(
        good && "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400",
        (status === "FAILED" || status === "EXPIRED") && "border-destructive/30 text-destructive",
      )}
    >
      {label[status]}
    </Badge>
  );
}

function BankDetails({
  details,
  total,
  currency,
}: Readonly<{ details: ShopBankDetails; total: number; currency: string }>) {
  const { t } = useTranslation();
  const rows: [string, string | undefined][] = [
    [t("Account name"), details.accountName],
    [t("Account number"), details.accountNumber],
    [t("Bank"), details.bankName],
    [t("Routing / sort code"), details.routingCode],
  ];
  return (
    <CheckoutSection title={t("Pay by bank transfer")}>
      <p className="text-sm text-muted-foreground">
        {t("Send {total} to the account below. We'll ship once it arrives.", {
          total: formatMoney(total, currency),
        })}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-all select-all">{value}</dd>
            </div>
          ))}
      </dl>
      {details.instructions && (
        <p className="text-sm whitespace-pre-line">{details.instructions}</p>
      )}
    </CheckoutSection>
  );
}
