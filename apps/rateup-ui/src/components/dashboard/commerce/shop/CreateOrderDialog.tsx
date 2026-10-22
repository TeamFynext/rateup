import { IconAlertCircle, IconCircleCheck, IconClock, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createShopOrder,
  formatMoney,
  toMoney,
  type CreateShopOrderInput,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopPayments, useShopStore } from "@/backend/commerce/shop.query";
import { ContactPicker, type PickedContact } from "@/components/pipeline/lead/ContactPicker.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
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
import { Input } from "@/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { type PickedLine, ProductPicker, variantName } from "../inbox/ProductPicker.tsx";
import type { ChatShopChannel } from "../inbox/useInboxSelling.ts";
import { isOrderLimitError, OrderLimitAlert } from "./OrderLimit.tsx";
import { SHOP_PATHS } from "./shopMeta.ts";
import { LinkField, SettingsTabLink } from "./ShopUi.tsx";

type SendMode = CreateShopOrderInput["send"];
type Channel = CreateShopOrderInput["channel"];

const CHANNELS: readonly Channel[] = ["WHATSAPP", "INSTAGRAM", "MESSENGER", "MANUAL"];

/** The conversation an order is made from; without one the dialog asks for the customer. */
export interface OrderChat {
  contactId: string;
  /** Null for a conversation the shop cannot message (webchat): the order is only created. */
  channel: ChatShopChannel | null;
  channelAccountId: string | null;
  /** Past WhatsApp's 24-hour window nothing but a template reaches them. */
  sessionExpired?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat?: OrderChat;
}

/** Builds an order for a customer and, by default, sends them a link to pay in their chat. */
export function CreateOrderDialog({ open, onOpenChange, chat }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t("Create order")}</DialogTitle>
          <DialogDescription>
            {chat
              ? t("Build the cart for them, then send a payment or checkout link in this chat.")
              : t("Build a cart for a customer and send them a link to pay in their chat.")}
          </DialogDescription>
        </DialogHeader>
        {open && <CreateOrderBody chat={chat} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateOrderBody({
  chat,
  onClose,
}: Readonly<{ chat: OrderChat | undefined; onClose: () => void }>) {
  const { t } = useTranslation();
  const { data: store } = useShopStore();
  const { data: payments } = useShopPayments();
  const invalidateShop = useInvalidateShop();
  const [contact, setContact] = useState<PickedContact | null>(null);
  const [pickedChannel, setPickedChannel] = useState<Channel>("WHATSAPP");
  const [lines, setLines] = useState<ReadonlyMap<string, PickedLine>>(new Map());
  const [discountCode, setDiscountCode] = useState("");
  const [shippingRateId, setShippingRateId] = useState<string | null>(null);
  const [send, setSend] = useState<SendMode | null>(null);

  const hasProvider = Boolean(payments?.providers.some((p) => p.connected));
  // A shop that checks out in Shopify or WooCommerce takes delivery, codes and payment there.
  const storeCheckout =
    store?.checkoutVia === "SHOPIFY"
      ? "Shopify"
      : store?.checkoutVia === "WOOCOMMERCE"
        ? "WooCommerce"
        : null;
  const channel: Channel = chat ? (chat.channel ?? "MANUAL") : pickedChannel;
  const windowClosed = Boolean(chat?.sessionExpired);
  const canMessage = channel !== "MANUAL" && !windowClosed;
  const sendMode: SendMode = !canMessage
    ? "none"
    : (send ?? (hasProvider && !storeCheckout ? "payment_link" : "checkout_link"));
  const contactId = chat?.contactId ?? contact?.id ?? null;

  const currency = store?.currency;
  const rates = storeCheckout ? [] : (store?.shippingRates ?? []).filter((r) => r.active);
  const subtotal = [...lines.values()].reduce(
    (sum, l) => sum + toMoney(l.variant.price) * l.quantity,
    0,
  );

  const create = useMutation({
    mutationFn: (id: string) =>
      createShopOrder({
        contactId: id,
        channel,
        channelAccountId: chat?.channelAccountId ?? null,
        items: [...lines.values()].map((l) => ({ variantId: l.variant.id, quantity: l.quantity })),
        discountCode: storeCheckout ? null : discountCode.trim() || null,
        shippingRateId,
        send: sendMode,
      }),
    onSuccess: () => void invalidateShop(),
  });

  if (create.data) {
    const { order, delivery } = create.data;
    return (
      <>
        <div className="flex flex-col gap-3">
          <Alert>
            <IconCircleCheck className="text-green-600 dark:text-green-500" />
            <AlertTitle>
              {t("Order #{number} created · {total}", {
                number: order.number,
                total: formatMoney(order.total, order.currency),
              })}
            </AlertTitle>
            <AlertDescription>
              {sendMode === "none"
                ? t("Nothing was sent. Share the link yourself, or send it later from the order.")
                : delivery.sent
                  ? t("The link was sent in the chat.")
                  : t(
                      "The link couldn't be delivered in the chat. Copy it and share it another way.",
                    )}
            </AlertDescription>
          </Alert>
          <LinkField url={delivery.url} label={t("Order link")} />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            render={<Link to={SHOP_PATHS.order} params={{ orderId: order.id }} />}
          >
            {t("Open order")}
          </Button>
          <Button onClick={onClose}>{t("Done")}</Button>
        </DialogFooter>
      </>
    );
  }

  const channelLabels: Record<Channel, string> = {
    WHATSAPP: t("WhatsApp"),
    INSTAGRAM: t("Instagram"),
    MESSENGER: t("Messenger"),
    MANUAL: t("Manual (no chat)"),
  };
  const sendOptions: {
    value: SendMode;
    label: string;
    hint: ReactNode;
    disabled?: boolean;
  }[] = storeCheckout
    ? [
        {
          value: "checkout_link",
          label: t("Send checkout link"),
          hint: t("They pay on your {store} checkout page.", { store: storeCheckout }),
        },
        {
          value: "none",
          label: t("Just create"),
          hint: t("Save the order without messaging them."),
        },
      ]
    : [
        {
          value: "payment_link",
          label: t("Send payment link"),
          hint: hasProvider ? (
            t("They pay straight away; delivery details are asked in chat.")
          ) : (
            <>
              {t("Connect Stripe or Razorpay to send payment links.")}{" "}
              <SettingsTabLink tab="payments">{t("Open Getting paid")}</SettingsTabLink>
            </>
          ),
          disabled: !hasProvider,
        },
        {
          value: "checkout_link",
          label: t("Send checkout link"),
          hint: t("They add their address, pick delivery and pay on one page."),
        },
        {
          value: "none",
          label: t("Just create"),
          hint: t("Save the order without messaging them."),
        },
      ];

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-[minmax(0,1fr)_17rem] md:overflow-hidden">
        <div className="flex min-h-80 flex-col gap-3 md:min-h-0">
          {!chat && (
            <Field>
              <FieldLabel>{t("Customer")}</FieldLabel>
              <ContactPicker value={contact} onChange={setContact} />
            </Field>
          )}
          <ProductPicker
            mode="variants"
            lines={lines}
            onLine={(product, variant, quantity) =>
              setLines((current) => {
                const next = new Map(current);
                if (quantity < 1) next.delete(variant.id);
                else next.set(variant.id, { product, variant, quantity });
                return next;
              })
            }
          />
        </div>

        <div className="flex flex-col gap-4 md:overflow-y-auto">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("Cart")}</h3>
            {lines.size === 0 ? (
              <p className="text-xs text-muted-foreground">{t("Add products from the list.")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {[...lines.values()].map((line) => (
                  <li key={line.variant.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {line.quantity} × {line.product.title}
                      </span>
                      {line.product.variants.length > 1 && (
                        <span className="block truncate text-muted-foreground">
                          {variantName(line.variant)}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">
                      {currency &&
                        formatMoney(toMoney(line.variant.price) * line.quantity, currency)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t("Remove {product}", { product: line.product.title })}
                      onClick={() =>
                        setLines((current) => {
                          const next = new Map(current);
                          next.delete(line.variant.id);
                          return next;
                        })
                      }
                    >
                      <IconTrash />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {lines.size > 0 && currency && (
              <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>{t("Subtotal")}</span>
                <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
              </div>
            )}
          </section>

          {!chat && (
            <Field>
              <FieldLabel>{t("Channel")}</FieldLabel>
              <Select
                value={pickedChannel}
                onValueChange={(value) => {
                  const next = CHANNELS.find((c) => c === value);
                  if (next) setPickedChannel(next);
                }}
                items={CHANNELS.map((c) => ({ value: c, label: channelLabels[c] }))}
              >
                <SelectTrigger className="w-full" aria-label={t("Channel")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {channelLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {store?.allowCoupons !== false && !storeCheckout && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {t("Coupon code (optional)")}
              <Input
                value={discountCode}
                maxLength={32}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </label>
          )}

          {rates.length > 0 && (
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              {t("Delivery (optional)")}
              <Select
                items={[
                  { value: "", label: t("Let them choose") },
                  ...rates.map((r) => ({
                    value: r.id,
                    label: currency ? `${r.name} · ${formatMoney(r.price, currency)}` : r.name,
                  })),
                ]}
                value={shippingRateId ?? ""}
                onValueChange={(value) => setShippingRateId(value || null)}
              >
                <SelectTrigger className="w-full" aria-label={t("Delivery (optional)")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("Let them choose")}</SelectItem>
                  {rates.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {currency ? `${r.name} · ${formatMoney(r.price, currency)}` : r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {windowClosed ? (
            <Alert>
              <IconClock />
              <AlertTitle>{t("Window closed")}</AlertTitle>
              <AlertDescription>
                {chat?.channel === "WHATSAPP"
                  ? t(
                      "It's been more than 24 hours since their last message, so nothing can be sent in this chat. Create the order, then copy its link, or send a template first.",
                    )
                  : t(
                      "It's been more than 24 hours since their last message, so nothing can be sent in this chat. Create the order, then copy its link and share it another way.",
                    )}
              </AlertDescription>
            </Alert>
          ) : (
            canMessage && (
              <RadioGroup
                value={sendMode}
                onValueChange={(value) => {
                  if (value === "payment_link" || value === "checkout_link" || value === "none")
                    setSend(value);
                }}
                className="gap-2"
              >
                {sendOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-2.5",
                      sendMode === option.value && "border-primary bg-primary/5",
                      option.disabled && "cursor-not-allowed",
                    )}
                  >
                    <RadioGroupItem
                      value={option.value}
                      disabled={option.disabled}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          option.disabled && "text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )
          )}
        </div>
      </div>

      {create.isError && isOrderLimitError(create.error) ? (
        <OrderLimitAlert error={create.error} />
      ) : create.isError ? (
        <Alert variant="destructive">
          <IconAlertCircle />
          <AlertDescription>
            {getApiErrorMessage(create.error, t("Couldn't create the order."))}
          </AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          disabled={!lines.size || !contactId}
          loading={create.isPending}
          onClick={() => contactId && create.mutate(contactId)}
        >
          {windowClosed
            ? t("Create order without sending")
            : sendMode === "payment_link"
              ? t("Create and send payment link")
              : sendMode === "checkout_link"
                ? t("Create and send checkout link")
                : t("Create order")}
        </Button>
      </DialogFooter>
    </>
  );
}
