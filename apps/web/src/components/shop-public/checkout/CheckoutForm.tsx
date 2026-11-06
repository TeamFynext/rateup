import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Checkbox } from "@rateup/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { IconBrandWhatsapp, IconChevronDown, IconCreditCard } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Country, isSupportedCountry, isValidPhoneNumber } from "react-phone-number-input";

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
import { CountryDropdown } from "@/components/ui/country-dropdown.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError.ts";

import { MessageShopButton } from "../shared.tsx";
import { type AddressField, missingAddressField, requiredAddressFields } from "./addressRules.ts";
import {
  CheckoutSection,
  FlatCheckoutSections,
  OrderLines,
  OrderTotals,
  regionName,
} from "./OrderParts.tsx";
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
  /** Back from the gateway: still waiting for the payment, or done waiting without seeing it. */
  payment: "confirming" | "not_seen" | null;
  onPlaced: (bank: ShopBankDetails | null) => void;
  /** Leaving for the shop's own checkout page. */
  onLeave: () => void;
  /** Payment notices shown above the form. */
  notices?: React.ReactNode;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Refusals that mean the checkout changed under the shopper: reload it to show why. */
const STALE_CODES = new Set(["CONFLICT", "CHECKOUT_EXPIRED", "ORDER_LIMIT"]);

function chatUpdatesHint(channel: PublicCheckout["order"]["channel"], t: TFunction): string {
  switch (channel) {
    case "WHATSAPP":
      return t("We'll send updates in this WhatsApp chat.");
    case "INSTAGRAM":
      return t("We'll send updates in this Instagram chat.");
    case "MESSENGER":
      return t("We'll send updates in this Messenger chat.");
    default:
      return t("The shop will send you updates on this order.");
  }
}

/** The shopper's country from their browser language (`en-GB` → GB), when it is one we can dial. */
function visitorCountry(): Country | undefined {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && isSupportedCountry(region) ? region : undefined;
  } catch {
    return undefined;
  }
}

/** A field the order can't go through without. */
function Required() {
  const { t } = useTranslation();
  return (
    <span className="-ml-1 text-destructive" aria-hidden>
      *<span className="sr-only">{t("required")}</span>
    </span>
  );
}

/** Taller than the default control, to match the checkout's touch-sized inputs. */
const CONTROL = "h-11";

export function CheckoutForm(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { checkout } = props;
  const { order, store } = checkout;
  // Edited locally and sent in the background; the order is only the starting point.
  const [address, setAddress] = useState<ShopAddress>(() => ({
    ...order.shippingAddress,
    name: order.shippingAddress?.name ?? order.customerName ?? undefined,
  }));
  const [phone, setPhone] = useState(order.customerPhone ?? "");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const phoneId = useId();
  const emailId = useId();
  // Read after mount: the server has no locale to read, and a guess there would mismatch.
  const [localCountry, setLocalCountry] = useState<Country | undefined>();
  useEffect(() => setLocalCountry(visitorCountry()), []);

  // A chat order already has somewhere to send updates; only the storefront needs a number.
  const fromChat = order.channel !== "STOREFRONT";
  const phoneComplete = Boolean(phone) && isValidPhoneNumber(phone);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneInvalid = phoneTouched && Boolean(phone) && !phoneComplete;
  const needsPhone = !fromChat && !phoneComplete;
  const missingAddress = store.askAddress ? missingAddressField(address) : null;
  const closed = store.acceptingOrders === false;
  const noDelivery = store.chargesDelivery && !checkout.shippingRates.length;
  const blocker = closed
    ? t("{store} can't take new orders online right now.", { store: store.name })
    : needsPhone
      ? t("Add your WhatsApp number to continue.")
      : missingAddress
        ? t("{problem} to continue.", { problem: addressFieldError(missingAddress, t) })
        : noDelivery
          ? t("We don't deliver to this country yet.")
          : (store.chargesDelivery || store.askAddress) &&
              checkout.shippingRates.length > 0 &&
              !order.shippingRate
            ? t("Choose a delivery option to continue.")
            : null;
  const phoneCountry =
    address.country && isSupportedCountry(address.country) ? address.country : localCountry;

  const total = formatMoney(order.total, order.currency);

  return (
    <FlatCheckoutSections value>
      <div className="mx-auto grid w-full max-w-5xl px-4 lg:grid-cols-2">
        {/* The order summary: a toggle above the form on phones, the right column on desktop. */}
        <aside
          aria-label={t("Order summary")}
          className="-mx-4 flex flex-col gap-5 border-b border-border bg-(--summary-panel) px-4 py-4 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:self-start lg:border-b-0 lg:bg-transparent lg:py-10 lg:pr-0 lg:pl-12"
        >
          <button
            type="button"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((open) => !open)}
            className="flex items-center justify-between gap-3 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              {summaryOpen ? t("Hide order summary") : t("Show order summary")}
              <IconChevronDown
                className={cn("size-4 transition-transform", summaryOpen && "rotate-180")}
              />
            </span>
            <span className="text-base font-bold tabular-nums">{total}</span>
          </button>
          <div className={cn("flex-col gap-5 lg:flex", summaryOpen ? "flex" : "hidden")}>
            <OrderLines order={order} />
          </div>
          <div className={cn("flex-col gap-5 lg:flex", summaryOpen ? "flex" : "hidden")}>
            {(checkout.points || store.allowCoupons) && (
              <SavingsSection checkout={checkout} send={props.send} />
            )}
          </div>
          <OrderTotals order={order} className={cn("lg:block", summaryOpen ? "block" : "hidden")} />
        </aside>

        <div className="flex flex-col gap-8 py-6 lg:col-start-1 lg:row-start-1 lg:py-10 lg:pr-12">
          {props.notices}
          {closed && (
            <Alert>
              <AlertTitle>
                {t("{store} can't take new orders online right now", { store: store.name })}
              </AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span>
                  {store.whatsappNumber
                    ? t("Message them on WhatsApp and they'll take your order there.")
                    : t("Get in touch with the shop to place your order.")}
                </span>
                <MessageShopButton
                  whatsappNumber={store.whatsappNumber}
                  className="w-fit"
                  text={t("Hi {store}, I'd like to place order #{number}.", {
                    store: store.name,
                    number: order.number,
                  })}
                />
              </AlertDescription>
            </Alert>
          )}
          <CheckoutSection title={t("Contact")}>
            {fromChat && order.channel === "WHATSAPP" && order.customerPhone ? (
              <div className="rounded-xl bg-green-600/10 px-3 py-2.5">
                <p className="font-bold">{order.customerPhone}</p>
                <p className="inline-flex items-center gap-1 text-[13px] text-green-800 dark:text-green-400">
                  <IconBrandWhatsapp className="size-3.5" />
                  {chatUpdatesHint(order.channel, t)}
                </p>
              </div>
            ) : (
              <Field data-invalid={phoneInvalid || undefined}>
                <FieldLabel htmlFor={phoneId}>
                  {fromChat ? t("WhatsApp number (optional)") : t("WhatsApp number")}
                  {!fromChat && <Required />}
                </FieldLabel>
                <PhoneInput
                  // Remounts once the country is known, so the flag and dialling code follow it.
                  key={phoneCountry ?? "unknown"}
                  id={phoneId}
                  value={phone}
                  defaultCountry={phoneCountry}
                  international
                  countryCallingCodeEditable={false}
                  onChange={(value) => {
                    setPhone(value ?? "");
                    // Saved only once complete: a half-typed number is no use to anyone.
                    if (value && isValidPhoneNumber(value))
                      props.queue({ customer: { phone: value } });
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={phoneInvalid || undefined}
                  autoComplete="tel"
                  required={!fromChat}
                  className="[&_button]:h-11 [&_input]:h-11"
                />
                {phoneInvalid ? (
                  <FieldError>{t("Enter a complete phone number")}</FieldError>
                ) : (
                  <FieldDescription>
                    {fromChat
                      ? chatUpdatesHint(order.channel, t)
                      : t("We'll send your order updates here.")}
                  </FieldDescription>
                )}
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={emailId}>{t("Email (optional)")}</FieldLabel>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                inputMode="email"
                defaultValue={order.customerEmail ?? ""}
                className={CONTROL}
                onChange={(e) => {
                  const email = e.target.value.trim();
                  if (EMAIL.test(email)) props.queue({ customer: { email } });
                }}
              />
            </Field>
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
            country={address.country}
          />

          <div className="flex flex-col gap-3">
            {/* On phones the summary sits folded at the top, so the total is repeated here. */}
            <OrderTotals order={order} className="lg:hidden" />
            {props.saveError && (
              <p className="text-sm text-destructive" role="alert">
                {props.saveError}
              </p>
            )}
          </div>
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
          <SellerNote store={store} orderNumber={order.number} />
        </div>
      </div>
    </FlatCheckoutSections>
  );
}

/** Who the shopper is buying from, and where their details go. */
function SellerNote({
  store,
  orderNumber,
}: Readonly<{ store: PublicCheckout["store"]; orderNumber: number }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2 px-2 pt-1 text-center text-xs text-muted-foreground">
      <p>
        {t(
          "Sold by {store}. Your contact and delivery details go to {store} so they can fulfil your order.",
          { store: store.name },
        )}
      </p>
      <MessageShopButton
        whatsappNumber={store.whatsappNumber}
        variant="ghost"
        className="text-xs"
        text={t("Hi {store}, I have a question about order #{number}.", {
          store: store.name,
          number: orderNumber,
        })}
      />
    </div>
  );
}

function addressFieldError(field: AddressField, t: TFunction): string {
  switch (field) {
    case "name":
      return t("Enter your full name");
    case "line1":
      return t("Enter a street address");
    case "city":
      return t("Enter a city");
    case "region":
      return t("Enter a state");
    case "postalCode":
      return t("Enter a postal code");
    case "country":
      return t("Choose a country");
  }
}

function AddressSection({
  address,
  onChange,
}: Readonly<{
  address: ShopAddress;
  onChange: (address: ShopAddress, immediate: boolean) => void;
}>) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const required = new Set(requiredAddressFields(address.country));
  // Errors wait until the shopper has been through a field, so an empty form isn't all red.
  const [touched, setTouched] = useState<ReadonlySet<keyof ShopAddress>>(new Set());
  const touch = (key: keyof ShopAddress) => setTouched((prev) => new Set(prev).add(key));
  const field = (key: keyof ShopAddress, label: string, autoComplete: string) => {
    const isRequired = required.has(key as AddressField);
    const invalid = isRequired && touched.has(key) && !address[key]?.trim();
    return (
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={`${idPrefix}-${key}`}>
          {label}
          {isRequired && <Required />}
        </FieldLabel>
        <Input
          id={`${idPrefix}-${key}`}
          autoComplete={autoComplete}
          value={address[key] ?? ""}
          required={isRequired}
          aria-invalid={invalid || undefined}
          className={CONTROL}
          onBlur={() => touch(key)}
          onChange={(e) => onChange({ ...address, [key]: e.target.value }, false)}
        />
        {invalid && <FieldError>{addressFieldError(key as AddressField, t)}</FieldError>}
      </Field>
    );
  };

  return (
    <CheckoutSection title={t("Delivery address")}>
      <Field className="[&_button]:h-11">
        <FieldTitle aria-hidden>
          {t("Country")}
          <Required />
        </FieldTitle>
        <CountryDropdown
          placeholder={t("Choose your country")}
          defaultValue={address.country}
          onChange={(country) => onChange({ ...address, country: country.alpha2 }, true)}
        />
      </Field>
      {field("name", t("Full name"), "name")}
      {field("line1", t("Street address"), "address-line1")}
      {field("line2", t("Apartment, suite, etc. (optional)"), "address-line2")}
      <div className="grid grid-cols-2 items-start gap-2">
        {field("city", t("City"), "address-level2")}
        {field("postalCode", t("Postal code"), "postal-code")}
      </div>
      {field("region", t("State / region"), "address-level1")}
    </CheckoutSection>
  );
}

function DeliverySection({
  checkout,
  hasCountry,
  send,
  country,
}: Readonly<{
  checkout: PublicCheckout;
  hasCountry: boolean;
  send: (patch: PublicCheckoutPatch) => Promise<void>;
  country: string | undefined;
}>) {
  const { t } = useTranslation();
  const { order, shippingRates, store } = checkout;
  const [error, setError] = useState<string | null>(null);

  if (!shippingRates.length) {
    if (!store.askAddress) return null;
    return (
      <CheckoutSection title={t("Delivery method")}>
        <p className="text-sm text-muted-foreground">
          {hasCountry
            ? store.whatsappNumber
              ? t("We don't deliver to this country yet. Message us and we'll help.")
              : t("We don't deliver to this country yet.")
            : t("Add your address to see delivery options.")}
        </p>
        {hasCountry && (
          <MessageShopButton
            whatsappNumber={store.whatsappNumber}
            className="w-fit"
            text={t("Hi {store}, can you deliver order #{number} to {country}?", {
              store: store.name,
              number: order.number,
              country: country ? regionName(country) : "",
            })}
          />
        )}
      </CheckoutSection>
    );
  }

  return (
    <CheckoutSection title={t("Delivery method")}>
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
    <CheckoutSection>
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
              className="h-11 bg-background uppercase dark:bg-background"
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
  payment,
}: Readonly<Props & { blocker: string | null }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { order, paymentOptions, store } = checkout;
  const [confirm, setConfirm] = useState<WhatsappConfirmLink | null>(null);
  const [confirmExpired, setConfirmExpired] = useState(false);
  const pay = useMutation({
    mutationFn: async (method: "online" | "cod" | "bank") => {
      await flush();
      return payPublicCheckout(token, method);
    },
    onMutate: () => {
      setConfirm(null);
      setConfirmExpired(false);
    },
    onSuccess: (result) => {
      if (result.status === "redirect") globalThis.location.assign(result.url);
      else if (result.status === "verify") setConfirm(result);
      else onPlaced(result.status === "placed" ? (result.bank ?? null) : null);
    },
    // A new total, an expired link or a full month: the reloaded checkout shows which.
    onError: (error) => {
      if (STALE_CODES.has(getApiErrorData(error)?.code ?? ""))
        void queryClient.invalidateQueries({ queryKey: publicCheckoutKey(token) });
    },
  });

  useEffect(() => {
    if (!confirm) return;
    const left = new Date(confirm.expiresAt).getTime() - Date.now();
    if (left <= 0) {
      setConfirmExpired(true);
      return;
    }
    const timer = setTimeout(() => setConfirmExpired(true), left);
    return () => clearTimeout(timer);
  }, [confirm]);

  // The order is placed from the shopper's WhatsApp message, so this page only learns of it
  // by asking again: on return to the tab, and slowly in between. A key of its own, so the
  // page's query changes only through onPlaced, which also empties the bag.
  const watched = useQuery({
    queryKey: [...publicCheckoutKey(token), "awaiting-whatsapp"],
    queryFn: () => getPublicCheckout(token),
    enabled: Boolean(confirm) && !confirmExpired,
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });
  const placedElsewhere = Boolean(confirm) && watched.data?.order.status !== "DRAFT";
  useEffect(() => {
    if (placedElsewhere) onPlaced(null);
  }, [placedElsewhere, onPlaced]);

  const total = formatMoney(order.total, order.currency);
  const disabled = Boolean(blocker) || saving || payment === "confirming";
  // Cash and transfer orders from the storefront are confirmed on WhatsApp, which needs the
  // shop's number. `undefined` is an API that predates the field.
  const canConfirm = order.channel !== "STOREFRONT" || store.whatsappNumber !== null;
  const cod = paymentOptions.cod && canConfirm;
  const bank = paymentOptions.bank && canConfirm;
  const offers = paymentOptions.online || cod || bank;
  const helpText = t("Hi {store}, I'd like help paying for order #{number}.", {
    store: store.name,
    number: order.number,
  });

  return (
    <CheckoutSection title={t("Pay")}>
      {!offers ? (
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              {store.whatsappNumber
                ? t("{store} isn't taking payments here yet. Message them to finish your order.", {
                    store: store.name,
                  })
                : t("{store} isn't taking payments here yet.", { store: store.name })}
            </span>
            <MessageShopButton
              whatsappNumber={store.whatsappNumber}
              className="w-fit"
              text={helpText}
            />
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {payment === "not_seen" && (
            <p className="text-center text-sm font-medium">
              {t("Already paid? Don't pay again. Message the shop instead.")}
            </p>
          )}
          {paymentOptions.online && (
            <Button
              type="button"
              size="lg"
              variant={payment === "not_seen" ? "outline" : "default"}
              className="h-12 rounded-xl text-base font-bold"
              disabled={disabled}
              loading={pay.isPending && pay.variables === "online"}
              onClick={() => pay.mutate("online")}
            >
              <IconCreditCard />
              {payment === "not_seen"
                ? t("Try paying {total} again", { total })
                : t("Pay {total}", { total })}
            </Button>
          )}
          {(cod || bank) && (
            <div className={cn("grid gap-2", cod && bank && "grid-cols-2")}>
              {cod && (
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
              {bank && (
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
                {confirmExpired ? (
                  <span role="status">
                    {t("That confirmation has run out. Choose how to pay again to get a new one.")}
                  </span>
                ) : (
                  <>
                    <span>
                      {t(
                        "Confirm on WhatsApp to place your order. Send the message that opens, from the number we'll contact you on. This page updates once it arrives.",
                      )}
                    </span>
                    <Button
                      variant="outline"
                      className="h-11 w-fit rounded-xl"
                      render={<a href={confirm.waUrl} target="_blank" rel="noreferrer" />}
                    >
                      <IconBrandWhatsapp />
                      {t("Open WhatsApp")}
                    </Button>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {blocker && <p className="text-center text-sm text-muted-foreground">{blocker}</p>}
          {pay.isError && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-sm text-destructive" role="alert">
                {getApiErrorMessage(pay.error, t("Couldn't complete the payment. Try again."))}
              </p>
              {getApiErrorData(pay.error)?.code === "ORDER_LIMIT" && (
                <MessageShopButton whatsappNumber={store.whatsappNumber} text={helpText} />
              )}
            </div>
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
