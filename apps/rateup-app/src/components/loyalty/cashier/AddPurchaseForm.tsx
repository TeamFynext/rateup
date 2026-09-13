import React, { useState } from "react";
import { Text, View } from "react-native";

import type { LoyaltyEarningRule } from "@/api/loyalty/loyalty.type";

import { formatMoney, formatNumber } from "./logic/format";
import { estimateEarn } from "./logic/points-estimate";
import {
  CashierButton,
  CashierInput,
  Card,
  Field,
  FONT,
  FormHeader,
  InlineError,
  NUM,
  StepScroll,
  useTheme,
} from "./ui";

export interface AddPurchaseValues {
  amount: number;
  note?: string;
}

interface AddPurchaseFormProps {
  customerName: string;
  currentPoints: number;
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
  rules: LoyaltyEarningRule[];
  tier: { id: string; name: string; pointsMultiplier: number | string } | null;
  tiersEnabled: boolean;
  /** Reward costs the customer could reach, to say "enough for two rewards". */
  rewardCosts: number[];
  isSaving: boolean;
  /** A failure from the award, reported here rather than as a toast. */
  error: string | null;
  onSubmit: (values: AddPurchaseValues) => void;
}

/**
 * Points preview before confirming: staff can read "43 Beans, balance 1,283" aloud before
 * touching the button, which is where trust at the counter comes from.
 *
 * The web validates with zod through `react-hook-form`. This app has `react-hook-form` but
 * no zod, and the form is one required positive number — a resolver for that would be more
 * machinery than rule, so the check is inline and the button stays disabled until the
 * estimate exists, which is the same gate the web applies on top of its schema.
 */
export function AddPurchaseForm({
  customerName,
  currentPoints,
  currencySymbol,
  currencyCode,
  pointsName,
  rules,
  tier,
  tiersEnabled,
  rewardCosts,
  isSaving,
  error,
  onSubmit,
}: Readonly<AddPurchaseFormProps>) {
  const { t } = useTheme();
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const amount = Number(raw);
  const valid = raw.trim().length > 0 && Number.isFinite(amount) && amount > 0;
  const estimate = estimateEarn({ amount, rules, tier, tiersEnabled, tierId: tier?.id });
  const newBalance = currentPoints + (estimate?.points ?? 0);
  const affordable = rewardCosts.filter((cost) => cost <= newBalance).length;
  const money = (value: number) => formatMoney(value, currencyCode, currencySymbol);

  // Showing the arithmetic is what makes an estimate defensible when it is read out.
  const mathLine = estimate
    ? [
        estimate.rule.isDefault
          ? `${formatNumber(estimate.basePoints)} at ${
              Number(estimate.rule.pointsPerUnit ?? 0) * Number(estimate.rule.multiplier ?? 1)
            } per ${currencySymbol}1`
          : `${formatNumber(estimate.basePoints)} under ${estimate.rule.name}`,
        Number(estimate.rule.bonusPoints ?? 0) > 0 ? `+${estimate.rule.bonusPoints} flat` : null,
        estimate.tierMultiplier !== 1 && tier
          ? `then ${tier.name} ×${estimate.tierMultiplier}`
          : null,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const submit = () => {
    setTouched(true);
    if (!valid || !estimate) return;
    onSubmit({ amount, note: note.trim() || undefined });
  };

  return (
    <StepScroll
      footer={
        <CashierButton
          label={
            isSaving
              ? "Giving…"
              : estimate
                ? `Give ${formatNumber(estimate.points)} ${pointsName}`
                : `Give ${pointsName}`
          }
          onPress={submit}
          disabled={isSaving || !estimate}
          loading={isSaving}
        />
      }
    >
      <FormHeader title="Add purchase" subtitle={customerName} />

      <InlineError message={error} />

      <Field
        label="What did they spend?"
        error={touched && !valid ? "Enter an amount above zero." : null}
      >
        <CashierInput
          value={raw}
          onChangeText={setRaw}
          prefix={currencySymbol}
          emphasis
          invalid={touched && !valid}
          keyboardType="decimal-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </Field>

      <Card>
        {estimate ? (
          <View style={{ gap: 3 }}>
            <Text style={{ ...NUM, fontFamily: FONT.black, fontSize: 32, color: t.success }}>
              +{formatNumber(estimate.points)}{" "}
              <Text style={{ fontFamily: FONT.regular, fontSize: 15, color: t.fg3 }}>
                {pointsName}
              </Text>
            </Text>
            {mathLine ? (
              <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                {mathLine}
              </Text>
            ) : null}
            <Text
              style={{ ...NUM, fontFamily: FONT.medium, fontSize: 14, color: t.fg1, marginTop: 4 }}
            >
              Balance becomes {formatNumber(newBalance)} {pointsName}
              {affordable > 0
                ? affordable === 1
                  ? " — enough for one reward"
                  : ` — enough for ${affordable} rewards`
                : ""}
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg4, marginTop: 2 }}>
              Estimate — the receipt shows the exact figure.
            </Text>
          </View>
        ) : (
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
            {rules.length === 0
              ? "No earning rule is set up, so this purchase earns nothing."
              : "Enter the amount to see what it earns."}
          </Text>
        )}
      </Card>

      <Field label="Note (optional)">
        <CashierInput
          value={note}
          onChangeText={setNote}
          placeholder="Bill 8842"
          maxLength={200}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </Field>

      {/* An amount that earns nothing still deserves to be legible, so it is echoed back. */}
      {valid && !estimate ? (
        <Text style={{ ...NUM, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          {money(amount)}
        </Text>
      ) : null}
    </StepScroll>
  );
}
