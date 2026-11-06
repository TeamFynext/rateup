import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Checkbox } from "@rateup/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rateup/ui/components/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@rateup/ui/components/empty";
import { Field, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { Label } from "@rateup/ui/components/label";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rateup/ui/components/tabs";
import { Textarea } from "@rateup/ui/components/textarea";
import {
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCash,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconFileDownload,
  IconFileInvoice,
  IconLink,
  IconSend,
  IconReceiptRefund,
  IconTruckDelivery,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  addShopShipment,
  buyShopShippingLabel,
  cancelShopOrder,
  confirmShopCod,
  formatMoney,
  issueShopInvoice,
  viewShopInvoice,
  markShopOrderPaid,
  quoteShopShipping,
  refundShopOrder,
  sendShopInvoice,
  sendShopPaymentLink,
  setShopFulfillment,
  toMoney,
  updateShopOrderNote,
  refundShopReturn,
  updateShopReturn,
  type ShippingQuote,
  type ShopFulfillmentStatus,
  type ShopSettableFulfillmentStatus,
  type ShopOrderDetail,
  type ShopReturn,
} from "@/backend/commerce/shop.api";
import {
  useInvalidateShop,
  useShopOrder,
  useShopShippingProviders,
} from "@/backend/commerce/shop.query";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

import { useOrderLimitToast } from "../shop/OrderLimit.tsx";
import {
  channelLabel,
  customerName,
  fulfillmentBadge,
  fulfillmentStatusBadge,
  isRefundAmountValid,
  nextStepLabel,
  parseAmountInput,
  paymentBadge,
  SHOP_PATHS,
} from "../shop/shopMeta.ts";
import {
  KeyValue,
  ProductThumb,
  ShopPage,
  ShopSection,
  ToneBadge,
  useOpenShopSettings,
} from "../shop/ShopUi.tsx";

export function OrderDetailPage({ orderId }: Readonly<{ orderId: string }>) {
  const { t } = useTranslation();
  const { data: order, isPending, isError, error } = useShopOrder(orderId);
  const back = { to: SHOP_PATHS.orders, label: t("Orders") };

  if (isPending) {
    return (
      <ShopPage title={t("Order")} back={back}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </ShopPage>
    );
  }
  if (isError) {
    return (
      <ShopPage title={t("Order")} back={back}>
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("This order could not be loaded")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </ShopPage>
    );
  }
  return <OrderDetail order={order} />;
}

function useOrderAction<T>(
  fn: () => Promise<T>,
  success: string,
  onDone?: (result: T) => void,
  onFail?: (error: unknown) => void,
) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      toast.success(success);
      void invalidate();
      onDone?.(result);
    },
    onError: (e) =>
      onFail
        ? onFail(e)
        : toast.error(getApiErrorMessage(e, t("That did not work. Please try again."))),
  });
}

function OrderDetail({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const pay = paymentBadge(t, order.paymentStatus);
  const ful = fulfillmentBadge(t, order);
  const cancelled = order.status === "CANCELLED";
  const paid = order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED";
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const openSettings = useOpenShopSettings();
  const orderLimitToast = useOrderLimitToast();

  const sendLink = useOrderAction(
    () => sendShopPaymentLink(order.id),
    t("Payment link created"),
    async (result) => {
      if (result.delivered) return;
      const reason = result.deliveryError ?? t("chat closed");
      // Safari refuses a clipboard write that follows a request, so this can fail.
      if (await copyToClipboard(result.url)) {
        toast.warning(
          t(
            "The link could not be sent in chat ({reason}). It is copied, so you can paste it to the customer.",
            { reason },
          ),
        );
        return;
      }
      toast.warning(
        t("The link could not be sent in chat ({reason}). Copy it and paste it to the customer.", {
          reason,
        }),
        {
          description: result.url,
          duration: Infinity,
          action: { label: t("Copy link"), onClick: () => void copyToClipboard(result.url) },
        },
      );
    },
    (e) => {
      if (orderLimitToast(e)) return;
      if (getApiErrorData(e)?.code === "PAYMENT_UNAVAILABLE") {
        toast.error(
          getApiErrorMessage(e, t("Connect Stripe or Razorpay to take payments online")),
          {
            action: { label: t("Open Getting paid"), onClick: () => openSettings("payments") },
          },
        );
        return;
      }
      toast.error(getApiErrorMessage(e, t("Could not send the payment link")));
    },
  );
  const invalidateAll = useInvalidateShop();
  const confirmCod = useOrderAction(() => confirmShopCod(order.id), t("Cash order confirmed"));
  const markPaid = useMutation({
    mutationFn: (method: "cash" | "bank" | "manual") => markShopOrderPaid(order.id, method),
    onSuccess: () => {
      toast.success(t("Marked as paid"));
      void invalidateAll();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not mark the order paid"))),
  });

  const invoiceable = paid || order.paymentStatus === "REFUNDED";
  const openInvoice = (url: string, number: string) => {
    // Opening after a request can be blocked as a popup; the toast's button is a fresh click.
    if (!window.open(url, "_blank", "noopener")) {
      toast.success(t("Invoice {number} is ready", { number }), {
        action: { label: t("Open"), onClick: () => window.open(url, "_blank", "noopener") },
      });
    }
  };
  const downloadInvoice = useMutation({
    // Links expire within minutes, so even an issued invoice asks for a fresh one.
    mutationFn: () => (order.hasInvoice ? viewShopInvoice(order.id) : issueShopInvoice(order.id)),
    onSuccess: ({ url, number }) => {
      void invalidateAll();
      openInvoice(url, number);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not create the invoice"))),
  });
  const sendInvoice = useMutation({
    mutationFn: () => sendShopInvoice(order.id),
    onSuccess: (result) => {
      void invalidateAll();
      if (result.sent) {
        toast.success(t("Invoice sent to the customer"));
        return;
      }
      toast.warning(
        result.reason === "window_closed"
          ? t(
              "WhatsApp only accepts files while the customer's 24-hour window is open. Download the invoice and share it another way.",
            )
          : result.reason === "no_recipient"
            ? t("There is no chat with this customer to send it to.")
            : t("The invoice could not be sent. Please try again."),
      );
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not send the invoice"))),
  });

  const copyCheckout = async () => {
    if (!order.checkoutUrl) return;
    if (await copyToClipboard(order.checkoutUrl)) toast.success(t("Checkout link copied"));
    else toast.error(t("Could not copy"), { description: order.checkoutUrl });
  };

  const canSell = can("commerce.sell");
  const canManage = can("commerce.orders.manage");
  const canRefund = can("commerce.payments.manage");
  // Paid, invoiced and fulfilled in Shopify or WooCommerce; RateUp follows that store.
  const inStore = order.checkoutVia !== "RATEUP";
  const storeName = order.checkoutVia === "WOOCOMMERCE" ? "WooCommerce" : "Shopify";

  return (
    <ShopPage
      title={t("Order #{number}", { number: order.number })}
      back={{ to: SHOP_PATHS.orders, label: t("Orders") }}
      badges={
        <>
          <ToneBadge tone={pay.tone}>{pay.label}</ToneBadge>
          <ToneBadge tone={ful.tone}>{ful.label}</ToneBadge>
          {cancelled && <ToneBadge tone="err">{t("Cancelled")}</ToneBadge>}
          {order.reviewReason && <ToneBadge tone="warn">{t("Needs review")}</ToneBadge>}
        </>
      }
      description={t("{date} · via {channel}", {
        date: dayjs(order.placedAt ?? order.createdAt).format("MMM D, YYYY HH:mm"),
        channel: channelLabel(t, order.channel),
      })}
      actions={
        <>
          {order.contact && (
            <Button
              variant="outline"
              render={
                <Link
                  to="/dashboard/inbox"
                  search={{ tab: "open", contactId: order.contact.id, reveal: true }}
                />
              }
            >
              <IconBrandWhatsapp data-icon="inline-start" />
              {t("Open chat")}
            </Button>
          )}
          {order.paymentStatus === "COD_PENDING" &&
            !order.confirmedAt &&
            canManage &&
            !cancelled && (
              <Button
                variant="outline"
                loading={confirmCod.isPending}
                onClick={() => confirmCod.mutate()}
              >
                {t("Confirm cash order")}
              </Button>
            )}
          {!paid && !cancelled && canSell && (order.status === "DRAFT" || !inStore) && (
            <Button loading={sendLink.isPending} onClick={() => sendLink.mutate()}>
              <IconLink data-icon="inline-start" />
              {inStore ? t("Resend checkout link") : t("Send payment link")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              {t("More")}
              <IconChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {order.checkoutUrl && (
                <DropdownMenuItem onClick={() => void copyCheckout()}>
                  <IconCopy />
                  {t("Copy checkout link")}
                </DropdownMenuItem>
              )}
              {order.externalAdminUrl && (
                <DropdownMenuItem
                  render={
                    <a href={order.externalAdminUrl} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <IconExternalLink />
                  {t("Open in {store}", {
                    store: order.externalProvider === "woocommerce" ? "WooCommerce" : "Shopify",
                  })}
                </DropdownMenuItem>
              )}
              {invoiceable && !inStore && (order.hasInvoice || canManage) && (
                <DropdownMenuItem
                  disabled={downloadInvoice.isPending}
                  onClick={() => downloadInvoice.mutate()}
                >
                  <IconFileDownload />
                  {t("Download invoice")}
                </DropdownMenuItem>
              )}
              {invoiceable && !inStore && canSell && (
                <DropdownMenuItem
                  disabled={sendInvoice.isPending}
                  onClick={() => sendInvoice.mutate()}
                >
                  <IconSend />
                  {order.invoiceSentAt ? t("Resend invoice") : t("Send invoice to customer")}
                </DropdownMenuItem>
              )}
              {order.checkoutUrl && order.status !== "DRAFT" && !invoiceable && (
                <DropdownMenuItem
                  render={
                    <a
                      href={`${order.checkoutUrl}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <IconFileInvoice />
                  {t("Open invoice")}
                </DropdownMenuItem>
              )}
              {!paid && !cancelled && canManage && !inStore && (
                <DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t("Mark as paid")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => markPaid.mutate("cash")}>
                    <IconCash />
                    {t("Paid in cash")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => markPaid.mutate("bank")}>
                    <IconCash />
                    {t("Paid by bank transfer")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => markPaid.mutate("manual")}>
                    <IconCash />
                    {t("Paid some other way")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
              {paid && canRefund && order.checkoutVia === "RATEUP" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRefundOpen(true)}>
                    <IconReceiptRefund />
                    {t("Refund")}
                  </DropdownMenuItem>
                </>
              )}
              {!cancelled && canManage && (!inStore || order.status === "DRAFT") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setCancelOpen(true)}>
                    <IconX />
                    {t("Cancel order")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      {order.reviewReason && (
        <Alert className="mb-5">
          <IconAlertTriangle />
          <AlertTitle>{t("Paid, but this order needs review")}</AlertTitle>
          <AlertDescription>
            {order.reviewReason}
            {order.amountDue && toMoney(order.amountDue) > 0
              ? ` · ${t("{amount} given to the customer but not covered by the payment", {
                  amount: formatMoney(order.amountDue, order.currency),
                })}`
              : ""}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <ItemsSection order={order} />
          {inStore && !cancelled && order.status !== "DRAFT" && (
            <Alert>
              <IconExternalLink />
              <AlertTitle>{t("Fulfilled in {store}", { store: storeName })}</AlertTitle>
              <AlertDescription>
                {t("Pack, ship, cancel and refund it in {store}; this order follows along.", {
                  store: storeName,
                })}
              </AlertDescription>
            </Alert>
          )}
          {!cancelled && canManage && !inStore && <FulfillmentSection order={order} />}
          <TimelineSection order={order} />
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <CustomerSection order={order} />
          <DeliverySection order={order} />
          <PaymentSection
            order={order}
            onOpenInvoice={order.hasInvoice ? () => downloadInvoice.mutate() : undefined}
          />
          {order.attribution && <AttributionSection order={order} />}
          {order.returns.length > 0 && <ReturnsSection order={order} canManage={canManage} />}
          <NoteSection order={order} canManage={canManage} />
        </aside>
      </div>

      <RefundDialog order={order} open={refundOpen} onOpenChange={setRefundOpen} />
      <CancelDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
    </ShopPage>
  );
}

function ItemsSection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const money = (v: Parameters<typeof toMoney>[0]) => formatMoney(v, order.currency);
  const discount = toMoney(order.discountTotal);
  const points = toMoney(order.pointsDiscount);
  return (
    <ShopSection title={t("Items")}>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3.5">
            <ProductThumb src={item.imageUrl} name={item.title} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{item.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {[
                  item.variantTitle && item.variantTitle !== "Default" ? item.variantTitle : null,
                  item.sku,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {item.quantity} × {money(item.unitPrice)}
            </span>
            <span className="w-24 text-right font-semibold tabular-nums">
              {money(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 ml-auto flex max-w-sm flex-col border-t border-border pt-3">
        <KeyValue label={t("Subtotal")}>{money(order.subtotal)}</KeyValue>
        {discount > 0 && (
          <KeyValue
            label={
              order.discountCode ? t("Coupon {code}", { code: order.discountCode }) : t("Discount")
            }
          >
            −{money(discount)}
          </KeyValue>
        )}
        {points > 0 && (
          <KeyValue label={t("Loyalty points ({points} pts)", { points: order.pointsRedeemed })}>
            −{money(points)}
          </KeyValue>
        )}
        <KeyValue label={order.shippingRate?.name ?? t("Shipping")}>
          {money(order.shippingTotal)}
        </KeyValue>
        {toMoney(order.taxTotal) > 0 && (
          <KeyValue label={t("Tax")}>{money(order.taxTotal)}</KeyValue>
        )}
        <div className="mt-1 flex justify-between border-t border-border pt-2.5 text-base font-bold">
          <span>{t("Total")}</span>
          <span className="tabular-nums">{money(order.total)}</span>
        </div>
      </div>
    </ShopSection>
  );
}

/** The quick updates that move an order forward from where it is now; earlier steps are not offered. */
const NEXT_STATUSES: Record<ShopFulfillmentStatus, ShopSettableFulfillmentStatus[]> = {
  UNFULFILLED: ["PACKED", "OUT_FOR_DELIVERY", "DELIVERED"],
  PACKED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: ["OUT_FOR_DELIVERY", "DELIVERED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

function FulfillmentSection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const { data: providers } = useShopShippingProviders();
  const easypost = providers?.easypost.connected ?? false;
  const setStatus = useMutation({
    mutationFn: (status: ShopSettableFulfillmentStatus) => setShopFulfillment(order.id, status),
    onSuccess: () => {
      toast.success(t("Order updated. The customer gets a message if that update is switched on."));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not update the order"))),
  });

  const shipped = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.fulfillmentStatus);

  return (
    <ShopSection
      title={t("Ship this order")}
      description={nextStepLabel(t, order.nextStep)}
      actions={
        <div className="flex flex-wrap gap-1.5">
          {NEXT_STATUSES[order.fulfillmentStatus].map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate(s)}
            >
              {fulfillmentStatusBadge(t, s).label}
            </Button>
          ))}
        </div>
      }
    >
      {order.shipments.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {order.shipments.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm"
            >
              <IconTruckDelivery className="size-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">{s.carrier ?? t("Carrier")}</span>
              {s.trackingNumber && <span className="font-mono text-xs">{s.trackingNumber}</span>}
              <ToneBadge tone={fulfillmentStatusBadge(t, s.status).tone}>
                {fulfillmentStatusBadge(t, s.status).label}
              </ToneBadge>
              <span className="ml-auto flex gap-3">
                {s.trackingUrl && (
                  <a
                    href={s.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t("Tracking")}
                  </a>
                )}
                {s.labelUrl && (
                  <a
                    href={s.labelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t("Label")}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!shipped &&
        (easypost ? (
          <Tabs defaultValue="label">
            <TabsList>
              <TabsTrigger value="label">{t("Buy a label")}</TabsTrigger>
              <TabsTrigger value="manual">{t("Enter tracking myself")}</TabsTrigger>
            </TabsList>
            <TabsContent value="label" className="pt-3">
              <LabelForm order={order} />
            </TabsContent>
            <TabsContent value="manual" className="pt-3">
              <TrackingForm order={order} />
            </TabsContent>
          </Tabs>
        ) : (
          <TrackingForm order={order} />
        ))}
      {!shipped && (
        <p className="mt-3 rounded-lg bg-primary/5 p-3 text-[13px] text-primary">
          {t("{name} gets a message with the tracking link as soon as you mark it shipped.", {
            name: customerName(t, order.customerName ?? order.contact?.name).split(" ")[0],
          })}
        </p>
      )}
    </ShopSection>
  );
}

function TrackingForm({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const ship = useOrderAction(
    () =>
      addShopShipment(order.id, {
        carrier: carrier.trim() || null,
        trackingNumber: trackingNumber.trim() || null,
        trackingUrl: trackingUrl.trim() || null,
      }),
    t("Marked as shipped"),
  );
  return (
    <form
      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        ship.mutate();
      }}
    >
      <Field>
        <FieldLabel htmlFor="ship-carrier">{t("Courier")}</FieldLabel>
        <Input
          id="ship-carrier"
          value={carrier}
          maxLength={60}
          onChange={(e) => setCarrier(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="ship-number">{t("Tracking number")}</FieldLabel>
        <Input
          id="ship-number"
          value={trackingNumber}
          maxLength={80}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="ship-url">{t("Tracking link")}</FieldLabel>
        <Input
          id="ship-url"
          type="url"
          placeholder="https://"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
        />
      </Field>
      <Button type="submit" loading={ship.isPending}>
        {t("Mark as shipped")}
      </Button>
    </form>
  );
}

function LabelForm({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState("");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [rateId, setRateId] = useState("");
  const getQuote = useMutation({
    mutationFn: () => quoteShopShipping(order.id, { weightGrams: Number(weight) }),
    onSuccess: (result) => {
      setQuote(result);
      setRateId(result.rates[0]?.id ?? "");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not get shipping rates"))),
  });
  const buy = useOrderAction(
    () => buyShopShippingLabel(order.id, quote?.shipmentId ?? "", rateId),
    t("Label bought. The customer gets the tracking link."),
    (shipment) => {
      if (shipment.labelUrl) window.open(shipment.labelUrl, "_blank", "noopener");
    },
  );
  const weightValid = Number(weight) > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-40">
          <FieldLabel htmlFor="parcel-weight">{t("Parcel weight (g)")}</FieldLabel>
          <Input
            id="parcel-weight"
            inputMode="numeric"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
        <Button
          variant="outline"
          loading={getQuote.isPending}
          disabled={!weightValid}
          onClick={() => getQuote.mutate()}
        >
          {t("Get rates")}
        </Button>
      </div>
      {quote && (
        <>
          {quote.rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No carrier offered a rate for this parcel.")}
            </p>
          ) : (
            <RadioGroup value={rateId} onValueChange={(value) => setRateId(String(value))}>
              {quote.rates.map((rate) => (
                <Label
                  key={rate.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 font-normal has-data-checked:border-primary"
                >
                  <RadioGroupItem value={rate.id} />
                  <span className="flex-1">
                    <span className="font-semibold">{rate.carrier}</span> · {rate.service}
                    {rate.days !== null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {t("{count, plural, one {# day} other {# days}}", { count: rate.days })}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(rate.price, rate.currency)}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
          <Button
            className="w-fit"
            loading={buy.isPending}
            disabled={!rateId}
            onClick={() => buy.mutate()}
          >
            {t("Buy label")}
          </Button>
        </>
      )}
    </div>
  );
}

function TimelineSection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  return (
    <ShopSection title={t("Timeline")}>
      {order.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Nothing has happened yet.")}</p>
      ) : (
        <ol className="flex flex-col">
          {order.events.map((e, i) => (
            <li key={e.id} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 size-2.5 rounded-full bg-primary" aria-hidden />
                {i < order.events.length - 1 && (
                  <span className="w-0.5 flex-1 bg-border" aria-hidden />
                )}
              </div>
              <div className="flex-1 pb-4 text-sm font-medium">{e.message}</div>
              <time
                className="text-xs whitespace-nowrap text-muted-foreground"
                dateTime={e.createdAt}
              >
                {dayjs(e.createdAt).format("MMM D, HH:mm")}
              </time>
            </li>
          ))}
        </ol>
      )}
    </ShopSection>
  );
}

function CustomerSection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const name = customerName(t, order.customerName ?? order.contact?.name);
  const phone = order.customerPhone ?? order.contact?.phone;
  return (
    <ShopSection title={t("Customer")}>
      <div className="flex items-center gap-3">
        <ContactAvatar name={name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{name}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {[phone, order.customerEmail].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      {(order.customerStats || order.loyalty) && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {order.customerStats && (
            <>
              <div className="rounded-lg bg-muted p-2.5">
                <div className="text-xs text-muted-foreground">{t("Orders")}</div>
                <div className="font-bold tabular-nums">{order.customerStats.orders}</div>
              </div>
              <div className="rounded-lg bg-muted p-2.5">
                <div className="text-xs text-muted-foreground">{t("Spent")}</div>
                <div className="truncate font-bold tabular-nums">
                  {formatMoney(order.customerStats.spent, order.currency)}
                </div>
              </div>
            </>
          )}
          {order.loyalty && (
            <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/40">
              <div className="text-xs text-amber-700 dark:text-amber-500">
                {order.loyalty.tier ?? t("Member")}
              </div>
              <div className="font-bold tabular-nums">
                {t("{points} pts", { points: order.loyalty.points })}
              </div>
            </div>
          )}
        </div>
      )}
    </ShopSection>
  );
}

function DeliverySection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const a = order.shippingAddress;
  const lines = a
    ? [
        a.name,
        a.line1,
        a.line2,
        [a.city, a.region, a.postalCode].filter(Boolean).join(", "),
        a.country,
        a.phone,
      ].filter(Boolean)
    : [];
  const rate = order.shippingRate;
  return (
    <ShopSection title={t("Delivery")}>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No address yet.")}</p>
      ) : (
        <address className="text-sm leading-6 not-italic">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </address>
      )}
      {rate && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {rate.minDays !== null &&
          rate.minDays !== undefined &&
          rate.maxDays !== null &&
          rate.maxDays !== undefined
            ? t("{name} ({min}–{max} days)", {
                name: rate.name,
                min: rate.minDays,
                max: rate.maxDays,
              })
            : rate.name}
        </p>
      )}
    </ShopSection>
  );
}

function PaymentSection({
  order,
  onOpenInvoice,
}: Readonly<{ order: ShopOrderDetail; onOpenInvoice?: () => void }>) {
  const { t } = useTranslation();
  const payment = order.payments[0];
  const refunded = order.payments.reduce((s, p) => s + toMoney(p.refundedAmount), 0);
  return (
    <ShopSection title={t("Payment")}>
      <KeyValue label={t("Method")}>{order.paymentMethod ?? payment?.provider ?? "—"}</KeyValue>
      {order.externalProvider && (order.externalId || order.checkoutVia !== "RATEUP") && (
        <KeyValue label={order.checkoutVia !== "RATEUP" ? t("Checked out in") : t("Added to")}>
          {order.externalProvider === "woocommerce" ? "WooCommerce" : "Shopify"}
          {(order.externalName ?? order.externalId) &&
            (order.externalAdminUrl ? (
              <a
                href={order.externalAdminUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                {order.externalName ?? order.externalId}
              </a>
            ) : (
              <span className="ml-1.5 text-muted-foreground">
                {order.externalName ?? order.externalId}
              </span>
            ))}
        </KeyValue>
      )}
      {payment?.providerPaymentId && (
        <KeyValue label={t("Reference")}>
          <span className="font-mono text-xs break-all">{payment.providerPaymentId}</span>
        </KeyValue>
      )}
      <KeyValue label={t("Paid")}>
        {order.paidAt ? dayjs(order.paidAt).format("MMM D, YYYY HH:mm") : "—"}
      </KeyValue>
      {refunded > 0 && (
        <KeyValue label={t("Refunded")}>{formatMoney(refunded, order.currency)}</KeyValue>
      )}
      {order.invoiceNumber && (
        <KeyValue label={t("Invoice")}>
          {onOpenInvoice ? (
            <button type="button" onClick={onOpenInvoice} className="text-primary hover:underline">
              {order.invoiceNumber}
            </button>
          ) : (
            order.invoiceNumber
          )}
          {order.invoiceSentAt && (
            <span className="block text-xs text-muted-foreground">
              {t("Sent {date}", { date: dayjs(order.invoiceSentAt).format("MMM D, HH:mm") })}
            </span>
          )}
        </KeyValue>
      )}
      {payment?.linkUrl && order.paymentStatus === "PENDING" && (
        <a
          href={payment.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {t("Open payment link")}
          <IconExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </ShopSection>
  );
}

function AttributionSection({ order }: Readonly<{ order: ShopOrderDetail }>) {
  const { t } = useTranslation();
  const a = order.attribution;
  if (!a) return null;
  const source = (() => {
    switch (a.kind) {
      case "ctwa_ad":
        return a.adTitle
          ? t("Click-to-chat ad · “{title}”", { title: a.adTitle })
          : t("Click-to-chat ad");
      case "ig_comment":
        return t("Instagram comment");
      case "ig_story":
        return t("Instagram story");
      case "campaign":
        return t("Broadcast campaign");
      case "storefront":
        return t("Storefront");
      case "link":
        return t("Shared link");
    }
  })();
  return (
    <ShopSection title={t("Where this sale came from")}>
      <div className="flex flex-col gap-2">
        <ToneBadge tone="info">{source}</ToneBadge>
        {a.kind === "ctwa_ad" && a.freeWindowUntil && (
          <span className="text-[13px] text-muted-foreground">
            {t("The customer came from an ad, so messages to them are free until {time}.", {
              time: dayjs(a.freeWindowUntil).format("MMM D, HH:mm"),
            })}
          </span>
        )}
        {a.kind === "ctwa_ad" && order.adConversionSentAt && (
          <span className="text-[13px] text-muted-foreground">
            {t("Reported to Meta as a purchase from the ad on {time}.", {
              time: dayjs(order.adConversionSentAt).format("MMM D, HH:mm"),
            })}
          </span>
        )}
      </div>
    </ShopSection>
  );
}

function returnStatus(t: (key: string) => string, status: ShopReturn["status"]) {
  switch (status) {
    case "REQUESTED":
      return { label: t("Requested"), tone: "warn" as const };
    case "APPROVED":
      return { label: t("Approved"), tone: "info" as const };
    case "REJECTED":
      return { label: t("Rejected"), tone: "mute" as const };
    case "RECEIVED":
      return { label: t("Received"), tone: "info" as const };
    case "REFUNDED":
      return { label: t("Refunded"), tone: "ok" as const };
  }
}

function ReturnsSection({
  order,
  canManage,
}: Readonly<{ order: ShopOrderDetail; canManage: boolean }>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const invalidate = useInvalidateShop();
  const [refundFor, setRefundFor] = useState<ShopReturn | null>(null);
  const [amount, setAmount] = useState("");
  const [keepInStock, setKeepInStock] = useState<Record<string, boolean>>({});
  const restockFor = (id: string) => keepInStock[id] ?? true;
  const act = useMutation({
    mutationFn: (args: {
      id: string;
      action: "approve" | "reject" | "receive" | "refund";
      refundAmount?: number | null;
      restock?: boolean;
    }) =>
      args.action === "refund"
        ? refundShopReturn(args.id, { refundAmount: args.refundAmount })
        : updateShopReturn(args.id, { action: args.action, restock: args.restock }),
    onSuccess: () => {
      toast.success(t("Return updated"));
      setRefundFor(null);
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not update the return"))),
  });
  const itemTitle = (id: string) => order.items.find((i) => i.id === id)?.title ?? t("Item");
  const returnMax =
    refundFor?.refundAmount != null ? toMoney(refundFor.refundAmount) : orderRefundable(order);
  const returnAmountValid = isRefundAmountValid(amount, returnMax);

  return (
    <ShopSection title={t("Returns")}>
      <ul className="flex flex-col gap-3">
        {order.returns.map((r) => {
          const status = returnStatus(t, r.status);
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                <span className="text-xs text-muted-foreground">
                  {dayjs(r.createdAt).format("MMM D")}
                </span>
              </div>
              <span>{r.reason}</span>
              <span className="text-xs text-muted-foreground">
                {r.items.map((i) => `${i.quantity} × ${itemTitle(i.orderItemId)}`).join(", ")}
              </span>
              {canManage && (
                <div className="flex flex-wrap gap-1.5">
                  {r.status === "REQUESTED" && (
                    <>
                      <Button
                        size="sm"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: r.id, action: "approve" })}
                      >
                        {t("Approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ id: r.id, action: "reject" })}
                      >
                        {t("Reject")}
                      </Button>
                    </>
                  )}
                  {r.status === "APPROVED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={act.isPending}
                        onClick={() =>
                          act.mutate({ id: r.id, action: "receive", restock: restockFor(r.id) })
                        }
                      >
                        {t("Mark received")}
                      </Button>
                      <Label className="flex items-center gap-2 text-xs font-normal">
                        <Checkbox
                          checked={restockFor(r.id)}
                          onCheckedChange={(checked) =>
                            setKeepInStock((prev) => ({ ...prev, [r.id]: checked }))
                          }
                        />
                        {t("Put the items back in stock")}
                      </Label>
                    </>
                  )}
                  {(r.status === "APPROVED" || r.status === "RECEIVED") &&
                    can("commerce.payments.manage") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRefundFor(r);
                          setAmount("");
                        }}
                      >
                        {t("Refund")}
                      </Button>
                    )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog open={refundFor !== null} onOpenChange={(open) => !open && setRefundFor(null)}>
        {/* Refunding a return never restocks; receiving it does. */}
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Refund this return")}</DialogTitle>
            <DialogDescription>
              {t(
                "Up to {amount} can be refunded. Leave the amount empty to refund the returned items in full.",
                { amount: formatMoney(returnMax, order.currency) },
              )}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="return-refund">
              {t("Amount ({currency})", { currency: order.currency })}
            </FieldLabel>
            <Input
              id="return-refund"
              inputMode="decimal"
              value={amount}
              aria-invalid={!returnAmountValid}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              loading={act.isPending}
              disabled={!returnAmountValid}
              onClick={() => {
                if (!refundFor || !returnAmountValid) return;
                act.mutate({
                  id: refundFor.id,
                  action: "refund",
                  refundAmount: parseAmountInput(amount),
                });
              }}
            >
              {t("Refund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShopSection>
  );
}

function NoteSection({
  order,
  canManage,
}: Readonly<{ order: ShopOrderDetail; canManage: boolean }>) {
  const { t } = useTranslation();
  const [note, setNote] = useState(order.staffNote ?? "");
  const save = useOrderAction(
    () => updateShopOrderNote(order.id, note.trim() || null),
    t("Note saved"),
  );
  return (
    <ShopSection title={t("Staff note")} description={t("Only your team sees this.")}>
      {order.note && (
        <p className="mb-3 rounded-lg bg-muted p-3 text-sm">
          <span className="font-semibold">{t("From the customer")}</span> — {order.note}
        </p>
      )}
      <Textarea
        rows={3}
        value={note}
        maxLength={2000}
        disabled={!canManage}
        aria-label={t("Staff note")}
        onChange={(e) => setNote(e.target.value)}
      />
      {canManage && (
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          loading={save.isPending}
          disabled={note === (order.staffNote ?? "")}
          onClick={() => save.mutate()}
        >
          {t("Save note")}
        </Button>
      )}
    </ShopSection>
  );
}

const orderRefundable = (order: ShopOrderDetail) =>
  toMoney(order.total) - order.payments.reduce((s, p) => s + toMoney(p.refundedAmount), 0);

function RefundDialog({
  order,
  open,
  onOpenChange,
}: Readonly<{ order: ShopOrderDetail; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  const refundable = orderRefundable(order);
  const [amount, setAmount] = useState("");
  const refund = useOrderAction(
    () => refundShopOrder(order.id, parseAmountInput(amount)),
    t("Refund started"),
    () => onOpenChange(false),
  );
  const valid = isRefundAmountValid(amount, refundable);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("Refund order #{number}", { number: order.number })}</DialogTitle>
          <DialogDescription>
            {t("Up to {amount} can be refunded. Leave the amount empty to refund all of it.", {
              amount: formatMoney(refundable, order.currency),
            })}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="refund-amount">
            {t("Amount ({currency})", { currency: order.currency })}
          </FieldLabel>
          <Input
            id="refund-amount"
            inputMode="decimal"
            value={amount}
            aria-invalid={!valid}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button
            variant="destructive"
            loading={refund.isPending}
            disabled={!valid}
            onClick={() => refund.mutate()}
          >
            {t("Refund")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  order,
  open,
  onOpenChange,
}: Readonly<{ order: ShopOrderDetail; open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [notify, setNotify] = useState(true);
  const cancel = useOrderAction(
    () => cancelShopOrder(order.id, { reason: reason.trim(), restock, notify }),
    t("Order cancelled"),
    () => onOpenChange(false),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Cancel order #{number}?", { number: order.number })}</DialogTitle>
          <DialogDescription>
            {t(
              "This cannot be undone. A paid order is not refunded automatically; refund it separately.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="cancel-reason">{t("Reason")}</FieldLabel>
          <Input
            id="cancel-reason"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {order.checkoutVia === "RATEUP" && order.status !== "DRAFT" ? (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={restock} onCheckedChange={setRestock} />
            {t("Put the items back in stock")}
          </Label>
        ) : (
          order.externalProvider && (
            <p className="text-sm text-muted-foreground">
              {t("Its checkout in {store} is closed too, so it can't be paid there.", {
                store: order.externalProvider === "woocommerce" ? "WooCommerce" : "Shopify",
              })}
            </p>
          )
        )}
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={notify} onCheckedChange={setNotify} />
          {t("Tell the customer")}
        </Label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Keep order")}
          </Button>
          <Button
            variant="destructive"
            loading={cancel.isPending}
            disabled={!reason.trim()}
            onClick={() => cancel.mutate()}
          >
            {t("Cancel order")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
