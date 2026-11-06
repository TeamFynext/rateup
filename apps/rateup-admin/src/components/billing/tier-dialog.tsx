import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import {
  razorpayPlansQueryOptions,
  stripeProductsQueryOptions,
  useCreateTier,
  useUpdateTier,
  type RateupPlan,
  type RazorpayPlan,
  type StripeProduct,
  type TierInput,
} from "@/api/billing.api";
import type { SubscriptionFeatures } from "@/api/org-actions.api";
import { ActionDialog, done, Notice } from "@/components/ds/action-dialog";
import { completeFeatures } from "@/components/org/actions/features";
import { FeaturesEditor } from "@/components/org/actions/features-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";

/** The value a Select carries for "no link"; Base UI's Select will not carry null. */
const NONE = "__none__";

interface Draft {
  name: string;
  displayName: string;
  planType: "BASE" | "ADDON";
  badge: string;
  description: string;
  displayWidgetId: string;
  monthlyPrice: string;
  yearlyPrice: string;
  usdMonthlyPrice: string;
  usdYearlyPrice: string;
  monthlyPaymentPlanId: string;
  yearlyPaymentPlanId: string;
  usdMonthlyPaymentPlanId: string;
  usdYearlyPaymentPlanId: string;
  paymentPlanId: string;
  stripeId: string;
  features: SubscriptionFeatures;
}

const text = (value: number | null | undefined) => (value == null ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? null : Number(value));
const link = (value: string) => (value === NONE || value === "" ? null : value);

function fromPlan(plan: RateupPlan | undefined): Draft {
  return {
    name: plan?.name ?? "",
    displayName: plan?.displayName ?? "",
    planType: plan?.planType ?? "BASE",
    badge: plan?.badge ?? "",
    description: plan?.description.join("\n") ?? "",
    displayWidgetId: plan?.displayWidgetId ?? "",
    monthlyPrice: text(plan?.prices.monthly),
    yearlyPrice: text(plan?.prices.yearly),
    usdMonthlyPrice: text(plan?.prices.usdMonthly),
    usdYearlyPrice: text(plan?.prices.usdYearly),
    monthlyPaymentPlanId: plan?.razorpay.monthly?.id ?? NONE,
    yearlyPaymentPlanId: plan?.razorpay.yearly?.id ?? NONE,
    usdMonthlyPaymentPlanId: plan?.razorpay.usdMonthly?.id ?? NONE,
    usdYearlyPaymentPlanId: plan?.razorpay.usdYearly?.id ?? NONE,
    paymentPlanId: plan?.razorpay.legacy?.id ?? NONE,
    stripeId: plan?.stripe?.id ?? NONE,
    features: completeFeatures(plan?.features as Partial<SubscriptionFeatures> | null),
  };
}

function toInput(draft: Draft, plan: RateupPlan | undefined): TierInput {
  return {
    name: draft.name.trim(),
    displayName: draft.displayName.trim(),
    planType: draft.planType,
    badge: draft.badge.trim() || null,
    description: draft.description
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    displayWidgetId: draft.displayWidgetId.trim() || null,
    features: draft.features,
    // The single legacy price is not edited here; keep whatever the row has.
    price: plan?.prices.price ?? null,
    currency: (plan?.prices.currency as "INR" | "USD" | null) ?? null,
    monthlyPrice: num(draft.monthlyPrice),
    yearlyPrice: num(draft.yearlyPrice),
    usdMonthlyPrice: num(draft.usdMonthlyPrice),
    usdYearlyPrice: num(draft.usdYearlyPrice),
    paymentPlanId: link(draft.paymentPlanId),
    monthlyPaymentPlanId: link(draft.monthlyPaymentPlanId),
    yearlyPaymentPlanId: link(draft.yearlyPaymentPlanId),
    usdMonthlyPaymentPlanId: link(draft.usdMonthlyPaymentPlanId),
    usdYearlyPaymentPlanId: link(draft.usdYearlyPaymentPlanId),
    stripeId: link(draft.stripeId),
  };
}

const RAZORPAY_SLOTS: {
  key: keyof Draft & `${string}PaymentPlanId`;
  label: string;
  currency: string;
}[] = [
  { key: "monthlyPaymentPlanId", label: "Monthly (INR)", currency: "INR" },
  { key: "yearlyPaymentPlanId", label: "Yearly (INR)", currency: "INR" },
  { key: "usdMonthlyPaymentPlanId", label: "Monthly (USD)", currency: "USD" },
  { key: "usdYearlyPaymentPlanId", label: "Yearly (USD)", currency: "USD" },
];

const PRICES: { key: keyof Draft; label: string }[] = [
  { key: "monthlyPrice", label: "Monthly, ₹" },
  { key: "yearlyPrice", label: "Yearly, ₹" },
  { key: "usdMonthlyPrice", label: "Monthly, $" },
  { key: "usdYearlyPrice", label: "Yearly, $" },
];

/**
 * Create or edit a tier: what the customer sees (names, badge, bullet points), what it
 * costs, which gateway plans it sells through and the limits an org gets when it is put on
 * it. A gateway plan already sold by another tier is listed but cannot be picked.
 */
export function TierDialog({ plan, onClose }: { plan?: RateupPlan; onClose: () => void }) {
  const create = useCreateTier();
  const update = useUpdateTier();
  const razorpay = useQuery(razorpayPlansQueryOptions);
  const stripe = useQuery(stripeProductsQueryOptions);
  const [draft, setDraft] = useState(() => fromPlan(plan));
  const ids = {
    name: useId(),
    displayName: useId(),
    badge: useId(),
    description: useId(),
    widget: useId(),
  };
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const editFeatures = (change: (features: SubscriptionFeatures) => void) =>
    setDraft((current) => {
      const features = structuredClone(current.features);
      change(features);
      return { ...current, features };
    });

  const mutation = plan ? update : create;

  return (
    <ActionDialog
      open
      onOpenChange={onClose}
      wide
      title={plan ? `Edit ${plan.displayName ?? plan.name}` : "New plan"}
      description={
        plan
          ? `${plan.orgs} organisation(s) are on it. Changing the limits here changes what a future Change plan copies; it does not touch what they have now.`
          : "A tier customers can be put on, or an add-on pack they can buy."
      }
      submitLabel={plan ? "Save plan" : "Create plan"}
      blocked={
        (!draft.name.trim() && "Enter an internal name") ||
        (!draft.displayName.trim() && "Enter a display name")
      }
      pending={mutation.isPending}
      error={mutation.error}
      onSubmit={(reason) => {
        const input = toInput(draft, plan);
        if (plan) {
          update.mutate(
            { id: plan.id, ...input, reason },
            { onSuccess: () => done("Plan saved.", onClose) },
          );
        } else {
          create.mutate({ ...input, reason }, { onSuccess: () => done("Plan created.", onClose) });
        }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.name} label="Internal name" hint="What the API and audit log call it">
          <Input
            id={ids.name}
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
            className="h-9 rounded-lg"
            autoFocus={!plan}
          />
        </Field>
        <Field id={ids.displayName} label="Display name" hint="What the customer sees">
          <Input
            id={ids.displayName}
            value={draft.displayName}
            onChange={(event) => set("displayName", event.target.value)}
            className="h-9 rounded-lg"
          />
        </Field>
        <Field id="tier-type" label="Kind">
          <Select
            value={draft.planType}
            onValueChange={(value) => set("planType", value as Draft["planType"])}
          >
            <SelectTrigger id="tier-type" className="h-9 w-full rounded-lg">
              <SelectValue>
                {(value: Draft["planType"]) =>
                  value === "ADDON" ? "Add-on pack" : "Tier (base plan)"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BASE">Tier (base plan)</SelectItem>
              <SelectItem value="ADDON">Add-on pack</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id={ids.badge} label="Badge" hint="e.g. “Popular”; blank for none">
          <Input
            id={ids.badge}
            value={draft.badge}
            onChange={(event) => set("badge", event.target.value)}
            className="h-9 rounded-lg"
          />
        </Field>
      </div>

      <Field
        id={ids.description}
        label="Bullet points"
        hint="One per line, shown on the pricing page"
      >
        <Textarea
          id={ids.description}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          className="min-h-24 rounded-xl"
        />
      </Field>

      <Section title="Prices" hint="List prices. What is charged comes from the gateway plan.">
        <div className="grid gap-4 sm:grid-cols-4">
          {PRICES.map((price) => (
            <Field key={price.key} id={`price-${price.key}`} label={price.label}>
              <Input
                id={`price-${price.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={draft[price.key] as string}
                onChange={(event) => set(price.key, event.target.value as never)}
                className="h-9 rounded-lg tabular"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Sells through" hint="Only unlinked gateway plans can be chosen.">
        <div className="grid gap-4 sm:grid-cols-2">
          {RAZORPAY_SLOTS.map((slot) => (
            <Field key={slot.key} id={`gw-${slot.key}`} label={`Razorpay · ${slot.label}`}>
              <GatewaySelect
                id={`gw-${slot.key}`}
                value={draft[slot.key]}
                onChange={(value) => set(slot.key, value)}
                options={(razorpay.data ?? []).filter(
                  (row) => row.currency.toUpperCase() === slot.currency,
                )}
                tierId={plan?.id}
                loading={razorpay.isPending}
              />
            </Field>
          ))}
          <Field id="gw-stripe" label="Stripe product">
            <GatewaySelect
              id="gw-stripe"
              value={draft.stripeId}
              onChange={(value) => set("stripeId", value)}
              options={stripe.data ?? []}
              tierId={plan?.id}
              loading={stripe.isPending}
            />
          </Field>
          {(plan?.razorpay.legacy || draft.paymentPlanId !== NONE) && (
            <Field id="gw-legacy" label="Razorpay · Legacy">
              <GatewaySelect
                id="gw-legacy"
                value={draft.paymentPlanId}
                onChange={(value) => set("paymentPlanId", value)}
                options={razorpay.data ?? []}
                tierId={plan?.id}
                loading={razorpay.isPending}
              />
            </Field>
          )}
        </div>
      </Section>

      <Section
        title="Limits and features"
        hint="Copied to an organisation when it is put on this plan."
      >
        <FeaturesEditor draft={draft.features} onChange={editFeatures} />
      </Section>

      <Field
        id={ids.widget}
        label="Pricing widget id"
        hint="Marks the plan the website widget shows; blank for none"
      >
        <Input
          id={ids.widget}
          value={draft.displayWidgetId}
          onChange={(event) => set("displayWidgetId", event.target.value)}
          className="h-9 rounded-lg font-mono"
        />
      </Field>
      {draft.displayWidgetId.trim() && (
        <Notice tone="info">
          Only one plan can hold a widget id; any other plan holding this one is cleared.
        </Notice>
      )}
    </ActionDialog>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t pt-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

type GatewayOption = RazorpayPlan | StripeProduct;

function optionLabel(row: GatewayOption) {
  const money = formatMoney(row.amount, row.currency);
  const cadence =
    "period" in row
      ? `/ ${row.period}`
      : row.type === "recurring"
        ? `/ ${row.interval}`
        : "one-off";
  return `${row.name} · ${money} ${cadence}`;
}

function GatewaySelect({
  id,
  value,
  onChange,
  options,
  tierId,
  loading,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: GatewayOption[];
  tierId?: string;
  loading: boolean;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? NONE)}>
      <SelectTrigger id={id} className="h-9 w-full rounded-lg">
        <SelectValue placeholder={loading ? "Loading…" : "None"}>
          {(current: string) => {
            if (current === NONE) return "None";
            const row = options.find((option) => option.id === current);
            return row ? optionLabel(row) : current;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {options.map((row) => {
          const takenByOther = !!row.tier && row.tier.id !== tierId;
          return (
            <SelectItem key={row.id} value={row.id} disabled={takenByOther}>
              {optionLabel(row)}
              {takenByOther && ` — ${row.tier!.name}`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
