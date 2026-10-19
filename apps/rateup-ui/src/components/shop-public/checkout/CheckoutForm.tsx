import { IconBrandWhatsapp, IconChevronDown, IconCreditCard } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatMoney,
  getPublicCheckout,
  payPublicCheckout,
  type PublicCheckout,
  type PublicCheckoutPatch,
  type ShopAddress,
  type ShopBankDetails,
  type WhatsappConfirmLink,
} from "@/backend/commerce/shop.api";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { CountryDropdown } from "@/components/ui/country-dropdown.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { CheckoutSection, OrderLines, OrderTotals } from "./OrderParts.tsx";
import { StoreContinueSection } from "./StoreHandoff.tsx";
import { publicCheckoutKey } from "./useCheckout.ts";

interface Props {
  token: string;
  checkout: PublicCheckout;
  queue: (patch: PublicCheckoutPatch) => void;
  send: (patch: PublicCheckoutPatch) => Promise<void>;
  flush: () => Promise<void>;
  saving: boolean;
  saveError: string | null;
  onPlaced: (bank: ShopBankDetails | null) => void;
  /** Leaving for the shop's own checkout page. */
  onLeave: () => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CheckoutForm(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { checkout } = props;
  const { order, store } = checkout;
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Edited locally and sent in the background; the order is only the starting point.
  const [address, setAddress] = useState<ShopAddress>(() => ({
    ...order.shippingAddress,
    name: order.shippingAddress?.name ?? order.customerName ?? undefined,
  }));
  const [phone, setPhone] = useState(order.customerPhone ?? "");

  const fromChat = order.channel !== "STOREFRONT" && Boolean(order.customerPhone);
  const needsPhone = !fromChat && !phone;
  const needsAddress = store.askAddress && !(address.line1?.trim() && address.country);
  const blocker = needsPhone
    ? t("Add your WhatsApp number to continue.")
    : needsAddress
      ? t("Add your delivery address to continue.")
      : store.chargesDelivery && !checkout.shippingRates.length
        ? t("We don't deliver to this country yet. Message us and we'll help.")
        : (store.chargesDelivery || store.askAddress) &&
            checkout.shippingRates.length > 0 &&
            !order.shippingRate
          ? t("Choose a delivery option to continue.")
          : null;

  return (
    <div className="flex flex-col gap-3">
      <Collapsible defaultOpen={order.items.length <= 3}>
        <CheckoutSection
          title={t("Your order")}
          action={
            <CollapsibleTrigger className="group inline-flex items-center gap-1 rounded-md text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t("{count, plural, one {# item} other {# items}}", { count })}
              <IconChevronDown className="size-4 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
            </CollapsibleTrigger>
          }
        >
          <CollapsibleContent>
            <OrderLines order={order} />
          </CollapsibleContent>
        </CheckoutSection>
      </Collapsible>

      <CheckoutSection title={t("Contact")}>
        {fromChat ? (
          <div className="rounded-xl bg-green-600/10 px-3 py-2.5">
            <p className="font-bold">{order.customerPhone}</p>
            <p className="inline-flex items-center gap-1 text-[13px] text-green-800 dark:text-green-400">
              <IconBrandWhatsapp className="size-3.5" />
              {t("From your chat with us — order updates go there")}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("WhatsApp number")}
            <PhoneInput
              value={phone}
              onChange={(value) => {
                setPhone(value ?? "");
                if (value) props.queue({ customer: { phone: value } });
              }}
              placeholder="+1 555 0100"
            />
            <span className="text-xs font-normal text-muted-foreground">
              {t("We'll send your order updates here.")}
            </span>
          </label>
        )}
        <Input
          type="email"
          aria-label={t("Email (optional)")}
          placeholder={t("Email (optional)")}
          defaultValue={order.customerEmail ?? ""}
          className="h-11"
          onChange={(e) => {
            const email = e.target.value.trim();
            if (EMAIL.test(email)) props.queue({ customer: { email } });
          }}
        />
      </CheckoutSection>

      {store.askAddress && (
        <AddressSection
          address={address}
          onChange={(next, immediate) => {
            setAddress(next);
            const patch = { shippingAddress: next, customer: { name: next.name ?? null } };
            if (immediate) void props.send(patch).catch(() => undefined);
            else props.queue(patch);
          }}
        />
      )}

      <DeliverySection
        checkout={checkout}
        hasCountry={Boolean(address.country)}
        send={props.send}
      />

      {(checkout.points || store.allowCoupons) && (
        <SavingsSection checkout={checkout} send={props.send} />
      )}

      <CheckoutSection>
        <OrderTotals order={order} />
        {props.saveError && (
          <p className="text-sm text-destructive" role="alert">
            {props.saveError}
          </p>
        )}
      </CheckoutSection>

      {checkout.storeCheckout ? (
        <StoreContinueSection
          token={props.token}
          label={checkout.storeCheckout.label}
          flush={props.flush}
          saving={props.saving}
          blocker={blocker}
          onLeave={props.onLeave}
        />
      ) : (
        <PaySection {...props} blocker={blocker} />
      )}
    </div>
  );
}

function AddressSection({
  address,
  onChange,
}: Readonly<{
  address: ShopAddress;
  onChange: (address: ShopAddress, immediate: boolean) => void;
}>) {
  const { t } = useTranslation();
  const field = (key: keyof ShopAddress, label: string, autoComplete: string) => (
    <Input
      aria-label={label}
      placeholder={label}
      autoComplete={autoComplete}
      value={address[key] ?? ""}
      className="h-11"
      onChange={(e) => onChange({ ...address, [key]: e.target.value }, false)}
    />
  );

  return (
    <CheckoutSection title={t("Delivery address")}>
      {field("name", t("Full name"), "name")}
      {field("line1", t("Street address"), "address-line1")}
      {field("line2", t("Apartment, suite, etc. (optional)"), "address-line2")}
      <div className="grid grid-cols-2 gap-2">
        {field("city", t("City"), "address-level2")}
        {field("postalCode", t("Postal code"), "postal-code")}
      </div>
      {field("region", t("State / region"), "address-level1")}
      <CountryDropdown
        placeholder={t("Country")}
        defaultValue={address.country}
        onChange={(country) => onChange({ ...address, country: country.alpha2 }, true)}
      />
    </CheckoutSection>
  );
}

function DeliverySection({
  checkout,
  hasCountry,
  send,
}: Readonly<{
  checkout: PublicCheckout;
  hasCountry: boolean;
  send: (patch: PublicCheckoutPatch) => Promise<void>;
}>) {
  const { t } = useTranslation();
  const { order, shippingRates, store } = checkout;
  const [error, setError] = useState<string | null>(null);

  if (!shippingRates.length) {
    if (!store.askAddress) return null;
    return (
      <CheckoutSection title={t("Delivery")}>
        <p className="text-sm text-muted-foreground">
          {hasCountry
            ? t("We don't deliver to this country yet. Message us and we'll help.")
            : t("Add your address to see delivery options.")}
        </p>
      </CheckoutSection>
    );
  }

  return (
    <CheckoutSection title={t("Delivery")}>
      <RadioGroup
        value={order.shippingRate?.rateId ?? ""}
        onValueChange={(value) => {
          setError(null);
          if (typeof value === "string" && value) {
            send({ shippingRateId: value }).catch((e: unknown) =>
              setError(getApiErrorMessage(e, t("Couldn't choose that option. Try again."))),
            );
          }
        }}
        className="gap-2"
      >
        {shippingRates.map((rate) => {
          const selected = order.shippingRate?.rateId === rate.id;
          return (
            <label
              key={rate.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border border-input p-3 transition-colors",
                selected && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <RadioGroupItem value={rate.id} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{rate.name}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {deliveryDays(rate.minDays, rate.maxDays, t)}
                </span>
              </span>
              <span className="font-bold tabular-nums">
                {rate.price > 0 ? formatMoney(rate.price, order.currency) : t("Free")}
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </CheckoutSection>
  );
}

export function deliveryDays(
  min: number | null | undefined,
  max: number | null | undefined,
  t: TFunction,
): string {
  if (min != null && max != null && min !== max) return t("{min}–{max} days", { min, max });
  const days = max ?? min;
  if (days != null) return t("{count, plural, one {# day} other {# days}}", { count: days });
  return t("Delivery time confirmed after you order");
}

function SavingsSection({
  checkout,
  send,
}: Readonly<{ checkout: PublicCheckout; send: (patch: PublicCheckoutPatch) => Promise<void> }>) {
  const { t } = useTranslation();
  const { order, points, store } = checkout;
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const applyCoupon = useMutation({
    mutationFn: (discountCode: string | null) => send({ discountCode }),
    onMutate: () => setCouponError(null),
    onSuccess: () => setCode(""),
    onError: (e) => setCouponError(getApiErrorMessage(e, t("That code didn't work."))),
  });
  const usingPoints = order.pointsRedeemed > 0;

  return (
    <CheckoutSection title={t("Savings")}>
      {points && (points.points > 0 || usingPoints) && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-ru-amber-50 p-3 dark:bg-amber-950/40">
          <Checkbox
            checked={usingPoints}
            onCheckedChange={(checked) => {
              setPointsError(null);
              send({ usePoints: checked }).catch((e: unknown) =>
                setPointsError(getApiErrorMessage(e, t("Couldn't use your points. Try again."))),
              );
            }}
            className="size-4.5"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-bold">
              {t("Use {points} of your {balance} {unit}", {
                points: usingPoints ? order.pointsRedeemed : points.points,
                balance: points.balance,
                unit: points.currencyName.toLowerCase(),
              })}
            </span>
            <span className="block text-[13px] text-amber-700 dark:text-amber-500">
              {[
                points.tier,
                `−${formatMoney(usingPoints ? order.pointsDiscount : points.value, order.currency)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </label>
      )}
      {pointsError && (
        <p className="text-sm text-destructive" role="alert">
          {pointsError}
        </p>
      )}

      {store.allowCoupons &&
        (order.discountCode ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
            <span className="min-w-0">
              <span className="block font-bold">{order.discountCode}</span>
              <span className="block text-[13px] text-green-700 dark:text-green-500">
                {order.discountTotal > 0
                  ? t("Applied · −{amount}", {
                      amount: formatMoney(order.discountTotal, order.currency),
                    })
                  : t("Applied")}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={applyCoupon.isPending}
              onClick={() => applyCoupon.mutate(null)}
            >
              {t("Remove")}
            </Button>
          </div>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) applyCoupon.mutate(code.trim());
            }}
          >
            <Input
              aria-label={t("Coupon code")}
              placeholder={t("Coupon code")}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              aria-invalid={Boolean(couponError)}
              className="h-11 uppercase"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-11 px-4"
              loading={applyCoupon.isPending}
              disabled={!code.trim()}
            >
              {t("Apply")}
            </Button>
          </form>
        ))}
      {couponError && (
        <p className="text-sm text-destructive" role="alert">
          {couponError}
        </p>
      )}
    </CheckoutSection>
  );
}

function PaySection({
  token,
  checkout,
  flush,
  saving,
  onPlaced,
  blocker,
}: Readonly<Props & { blocker: string | null }>) {
  const { t } = useTranslation();
  const { order, paymentOptions, store } = checkout;
  const [confirm, setConfirm] = useState<WhatsappConfirmLink | null>(null);
  const pay = useMutation({
    mutationFn: async (method: "online" | "cod" | "bank") => {
      await flush();
      return payPublicCheckout(token, method);
    },
    onSuccess: (result) => {
      if (result.status === "redirect") globalThis.location.assign(result.url);
      else if (result.status === "verify") setConfirm(result);
      else onPlaced(result.status === "placed" ? (result.bank ?? null) : null);
    },
  });
  // The order is placed from the shopper's WhatsApp message, so this page only learns of it
  // by asking again. A key of its own, so the page's query changes only through onPlaced,
  // which also empties the bag.
  const watched = useQuery({
    queryKey: [...publicCheckoutKey(token), "awaiting-whatsapp"],
    queryFn: () => getPublicCheckout(token),
    enabled: Boolean(confirm),
    refetchInterval: 3000,
  });
  const placedElsewhere = Boolean(confirm) && watched.data?.order.status !== "DRAFT";
  useEffect(() => {
    if (placedElsewhere) onPlaced(null);
  }, [placedElsewhere, onPlaced]);
  const total = formatMoney(order.total, order.currency);
  const disabled = Boolean(blocker) || saving;
  const offers = paymentOptions.online || paymentOptions.cod || paymentOptions.bank;

  return (
    <CheckoutSection title={t("Pay")}>
      {!offers ? (
        <Alert>
          <AlertDescription>
            {t("{store} isn't taking payments here yet. Message them to finish your order.", {
              store: store.name,
            })}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {paymentOptions.online && (
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-xl text-base font-bold"
              disabled={disabled}
              loading={pay.isPending && pay.variables === "online"}
              onClick={() => pay.mutate("online")}
            >
              <IconCreditCard />
              {t("Pay {total}", { total })}
            </Button>
          )}
          {(paymentOptions.cod || paymentOptions.bank) && (
            <div
              className={cn(
                "grid gap-2",
                paymentOptions.cod && paymentOptions.bank && "grid-cols-2",
              )}
            >
              {paymentOptions.cod && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl font-semibold"
                  disabled={disabled}
                  loading={pay.isPending && pay.variables === "cod"}
                  onClick={() => pay.mutate("cod")}
                >
                  {t("Cash on delivery")}
                </Button>
              )}
              {paymentOptions.bank && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl font-semibold"
                  disabled={disabled}
                  loading={pay.isPending && pay.variables === "bank"}
                  onClick={() => pay.mutate("bank")}
                >
                  {t("Bank transfer")}
                </Button>
              )}
            </div>
          )}
          {confirm && (
            <Alert>
              <IconBrandWhatsapp />
              <AlertDescription className="flex flex-col gap-3">
                <span>
                  {t(
                    "Confirm on WhatsApp to place your order: send the message that opens, from the number we'll contact you on. This page updates once it arrives.",
                  )}
                </span>
                <Button
                  variant="outline"
                  className="w-fit"
                  render={<a href={confirm.waUrl} target="_blank" rel="noreferrer" />}
                >
                  <IconBrandWhatsapp />
                  {t("Open WhatsApp")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {blocker && <p className="text-center text-sm text-muted-foreground">{blocker}</p>}
          {pay.isError && (
            <p className="text-center text-sm text-destructive" role="alert">
              {getApiErrorMessage(pay.error, t("Couldn't complete the payment. Try again."))}
            </p>
          )}
          {paymentOptions.online && (
            <p className="text-center text-xs text-muted-foreground">
              {t("Card payments are processed by {provider}. {store} never sees your card.", {
                provider: paymentOptions.online.label,
                store: store.name,
              })}
            </p>
          )}
        </>
      )}
    </CheckoutSection>
  );
}
