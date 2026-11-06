import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import {
  toMoney,
  type ShopCheckoutVia,
  type ShopStore,
  type ShopStoreUpdate,
} from "@/backend/commerce/shop.api";
import { useShopDiscounts } from "@/backend/commerce/shop.query";
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
import { Switch } from "@/components/ui/switch.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";

import { SettingsSaveBar } from "../shop/SettingsSaveBar.tsx";
import { SettingRow, ShopSection } from "../shop/ShopUi.tsx";
import { numOrNull, useStoreSection } from "../shop/useStoreSection.ts";
import { StopSyncButton, StoreDisconnectedAlert } from "./StoreCheckoutNotice.tsx";

const REMINDER_PRESETS = [30, 60, 180, 1440] as const;
const NONE = "none";

function checkoutDraft(store: ShopStore) {
  return {
    checkoutVia: store.checkoutVia,
    askAddress: store.askAddress,
    askDelivery: store.askDelivery,
    offerPoints: store.offerPoints,
    allowCoupons: store.allowCoupons,
    pointValue: store.pointValue === null ? "" : String(toMoney(store.pointValue)),
    minPointsToRedeem: String(store.minPointsToRedeem),
    maxPointsPct: String(store.maxPointsPct),
    paymentLinkTtlHours: String(store.paymentLinkTtlHours),
    cartReminderMinutes: store.cartReminderMinutes.map(String),
    cartReminderDiscountId: store.cartReminderDiscountId ?? "",
  };
}
type CheckoutDraft = ReturnType<typeof checkoutDraft>;

const checkoutPatch = (d: CheckoutDraft): ShopStoreUpdate => ({
  askAddress: d.askAddress,
  askDelivery: d.askDelivery,
  offerPoints: d.offerPoints,
  allowCoupons: d.allowCoupons,
  pointValue: numOrNull(d.pointValue),
  minPointsToRedeem: Number(d.minPointsToRedeem) || 1,
  maxPointsPct: Math.min(100, Math.max(1, Number(d.maxPointsPct) || 100)),
  paymentLinkTtlHours: Number(d.paymentLinkTtlHours) || 24,
  cartReminderMinutes: d.cartReminderMinutes.map(Number).sort((a, b) => a - b),
  cartReminderDiscountId: d.cartReminderDiscountId || null,
});

export function CheckoutTab({ store }: Readonly<{ store: ShopStore }>) {
  const canManage = useCan("commerce.payments.manage");
  const initial = checkoutDraft(store);
  return (
    <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-5">
      <StoreDisconnectedAlert store={store} />
      <CheckoutForm
        key={JSON.stringify(initial)}
        initial={initial}
        store={store}
        canManage={canManage}
      />
    </fieldset>
  );
}

function StepNumber({ n }: Readonly<{ n: number }>) {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {n}
    </span>
  );
}

const STORE_NAME = { SHOPIFY: "Shopify", WOOCOMMERCE: "WooCommerce" } as const;

function CheckoutForm({
  initial,
  store,
  canManage,
}: Readonly<{
  initial: CheckoutDraft;
  store: ShopStore;
  canManage: boolean;
}>) {
  const { currency, mode: storeMode } = store;
  const { t } = useTranslation();
  const { data: discounts = [] } = useShopDiscounts();
  // Sent only when changed: a store that was disconnected would otherwise refuse every save here.
  const s = useStoreSection(initial, (d) => ({
    ...checkoutPatch(d),
    ...(d.checkoutVia !== initial.checkoutVia ? { checkoutVia: d.checkoutVia } : {}),
  }));
  const inStore = s.draft.checkoutVia !== "RATEUP";
  const reminderLabel = (m: number) =>
    m < 60
      ? t("{count} minutes", { count: m })
      : m < 1440
        ? t("{count, plural, one {# hour} other {# hours}}", { count: m / 60 })
        : t("{count, plural, one {# day} other {# days}}", { count: m / 1440 });
  const activeCodes = discounts.filter((d) => d.state === "ACTIVE" || d.state === "ENDS_SOON");

  const steps = [
    {
      key: "askAddress",
      title: t("Delivery address"),
      description: t("Asked with the WhatsApp address form and saved for next time."),
    },
    {
      key: "askDelivery",
      title: t("Delivery option"),
      description: t("Shows the rates from Commerce → Settings → Delivery that match the address."),
    },
    {
      key: "offerPoints",
      title: t("Use loyalty points"),
      description: t("Only asked when the customer has enough points."),
    },
    {
      key: "allowCoupons",
      title: t("Coupon code"),
      description: t("Customers can type a code before paying."),
    },
  ] as const;

  return (
    <>
      {storeMode !== "NATIVE" ? (
        <CheckoutPlace
          shop={store}
          store={STORE_NAME[storeMode]}
          storeVia={storeMode}
          value={s.draft.checkoutVia}
          onChange={(checkoutVia) => s.set({ checkoutVia })}
        />
      ) : (
        <ShopSection
          title={t("Where customers pay")}
          description={t(
            "On RateUp checkout. To let customers pay on your Shopify or WooCommerce checkout instead, connect the store and import its products with “Keep in sync” on, from Products → Import.",
          )}
        >
          <p className="text-sm text-muted-foreground">{rateupMethodsHint(t, store)}</p>
        </ShopSection>
      )}

      {!inStore && (
        <ShopSection
          title={t("Checkout in chat")}
          description={t("What we ask after a customer sends a cart, in this order.")}
        >
          {steps.map((step, i) => (
            <SettingRow
              key={step.key}
              title={
                <span className="flex items-center gap-3">
                  <StepNumber n={i + 1} />
                  {step.title}
                </span>
              }
              description={step.description}
              control={
                <Switch
                  aria-label={step.title}
                  checked={s.draft[step.key]}
                  onCheckedChange={(v) => s.set({ [step.key]: v })}
                />
              }
            >
              {step.key === "offerPoints" && s.draft.offerPoints && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="points-value">
                      {t("Value of 1 point ({currency})", { currency })}
                    </FieldLabel>
                    <Input
                      id="points-value"
                      inputMode="decimal"
                      value={s.draft.pointValue}
                      onChange={(e) => s.set({ pointValue: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="points-min">{t("Fewest points to redeem")}</FieldLabel>
                    <Input
                      id="points-min"
                      inputMode="numeric"
                      value={s.draft.minPointsToRedeem}
                      onChange={(e) => s.set({ minPointsToRedeem: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="points-max">
                      {t("Most of the order paid in points (%)")}
                    </FieldLabel>
                    <Input
                      id="points-max"
                      inputMode="numeric"
                      value={s.draft.maxPointsPct}
                      onChange={(e) => s.set({ maxPointsPct: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            </SettingRow>
          ))}
          <SettingRow
            title={
              <span className="flex items-center gap-3">
                <StepNumber n={5} />
                {t("Payment link")}
              </span>
            }
            description={t("How long a payment link stays valid.")}
            control={
              <span className="flex items-center gap-1.5">
                <Input
                  className="w-20"
                  inputMode="numeric"
                  aria-label={t("Hours a payment link is valid")}
                  value={s.draft.paymentLinkTtlHours}
                  onChange={(e) => s.set({ paymentLinkTtlHours: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">{t("hours")}</span>
              </span>
            }
          />
        </ShopSection>
      )}

      {!inStore && (
        <ShopSection
          title={t("Cart reminders")}
          description={t(
            "Remind customers who sent a cart but did not pay. Pick up to three times.",
          )}
        >
          <div className="flex flex-col gap-4">
            <ToggleGroup
              variant="outline"
              multiple
              className="flex-wrap"
              value={s.draft.cartReminderMinutes}
              onValueChange={(values) => s.set({ cartReminderMinutes: values.slice(0, 3) })}
            >
              {REMINDER_PRESETS.map((m) => (
                <ToggleGroupItem key={m} value={String(m)}>
                  {reminderLabel(m)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {s.draft.cartReminderMinutes.length > 0 && (
              <Field className="max-w-sm">
                <FieldLabel>{t("Add a coupon to the last reminder")}</FieldLabel>
                <Select
                  value={s.draft.cartReminderDiscountId || NONE}
                  onValueChange={(value) =>
                    s.set({ cartReminderDiscountId: value && value !== NONE ? value : "" })
                  }
                  items={[
                    { value: NONE, label: t("No coupon") },
                    ...activeCodes.map((d) => ({ value: d.id, label: d.code })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("No coupon")}</SelectItem>
                    {activeCodes.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
        </ShopSection>
      )}

      {canManage && (
        <SettingsSaveBar
          dirty={s.dirty}
          saving={s.save.isPending}
          onSave={() => s.save.mutate()}
          onDiscard={s.reset}
        />
      )}
    </>
  );
}

/** What RateUp checkout takes right now, from the shop's own payment settings. */
function rateupMethodsHint(t: TFunction, shop: ShopStore) {
  const methods = [
    ...(shop.payments?.providers.filter((p) => p.connected).map((p) => p.label) ?? []),
    ...(shop.codEnabled ? [t("cash on delivery")] : []),
    ...(shop.bankTransferEnabled ? [t("bank transfer")] : []),
  ];
  return methods.length
    ? t("Customers pay by {methods}.", { methods: methods.join(", ") })
    : t(
        "No way to get paid is set up yet. Set one up under Getting paid, or customers can't check out.",
      );
}

function CheckoutPlace({
  shop,
  store,
  storeVia,
  value,
  onChange,
}: Readonly<{
  shop: ShopStore;
  store: string;
  storeVia: Exclude<ShopCheckoutVia, "RATEUP">;
  value: ShopCheckoutVia;
  onChange: (value: ShopCheckoutVia) => void;
}>) {
  const { t } = useTranslation();
  const options = [
    {
      value: storeVia,
      title: t("{store} checkout", { store }),
      hint:
        storeVia === "WOOCOMMERCE"
          ? t(
              "Customers add their address and pick one of your RateUp delivery rates, then pay on your WooCommerce checkout page, which handles tax and invoices. RateUp coupons, points at checkout and cart reminders don't apply.",
            )
          : t(
              "Customers pay on your Shopify checkout page, which handles delivery, tax, invoices and discount codes. RateUp coupons, points at checkout and cart reminders don't apply.",
            ),
    },
    {
      value: "RATEUP" as const,
      title: t("RateUp checkout"),
      hint: `${rateupMethodsHint(t, shop)} ${t(
        "Coupons, loyalty points and cart reminders work in chat, and orders are added to {store}.",
        { store },
      )}`,
    },
  ];
  return (
    <ShopSection
      title={t("Where customers pay")}
      description={t(
        "Your products stay in sync with {store}. This applies to the storefront, checkout links in chat, comment replies and the AI agent.",
        { store },
      )}
    >
      <RadioGroup
        value={value}
        onValueChange={(next) => {
          if (next === "RATEUP" || next === storeVia) onChange(next);
        }}
        className="gap-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3",
              value === option.value && "border-primary bg-primary/5",
            )}
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="block text-sm text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
      <div>
        <StopSyncButton store={shop} />
      </div>
    </ShopSection>
  );
}
