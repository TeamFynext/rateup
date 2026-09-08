import { useMemo } from "react";
import { useWatch, type Control } from "react-hook-form";

import type { GivebackContext } from "../onboarding/givebackContext.ts";
import type { EarningFormInput, RewardsFormInput, TiersFormInput } from "../onboarding/schemas.ts";
import { calculateGiveback, toFiniteNumber } from "./calculateGiveback";
import { GivebackPanel } from "./GivebackPanel";

/**
 * Each wizard step owns one slice of the programme and inherits the rest from the page.
 *
 * The `useWatch` lives here rather than at the top of the step on purpose: subscribing in
 * the step body would re-render its whole `useFieldArray` list on every keystroke, so the
 * subscription is pushed down to the only subtree that needs to move.
 *
 * No debounce — the calculation is a handful of multiplications over single-digit arrays,
 * and a number that lags behind the input reads as broken.
 */

interface WrapperProps<T extends Record<string, unknown>> {
  control: Control<T>;
  context: GivebackContext;
  onEditAverageOrderValue?: () => void;
  title?: string;
  hint?: string;
}

function panelProps({
  context,
  onEditAverageOrderValue,
  title,
  hint,
}: Pick<
  WrapperProps<Record<string, unknown>>,
  "context" | "onEditAverageOrderValue" | "title" | "hint"
>) {
  return {
    currencySymbol: context.currencySymbol,
    currencyCode: context.currencyCode,
    pointsName: context.pointsName,
    averageOrderValue: context.averageOrderValue,
    onEditAverageOrderValue,
    title,
    hint,
  };
}

export function EarningGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
  title,
  hint,
}: Readonly<WrapperProps<EarningFormInput>>) {
  const rules = useWatch({ control, name: "rules" });
  const rule = rules?.find((r) => r.isDefault) ?? rules?.[0];

  const result = useMemo(
    () =>
      calculateGiveback({
        ...context,
        earnRate: {
          pointsPerUnit: toFiniteNumber(rule?.pointsPerUnit),
          multiplier: toFiniteNumber(rule?.multiplier, 1),
          bonusPoints: toFiniteNumber(rule?.bonusPoints),
        },
      }),
    // Depend on the scalars, not the watched array — `useWatch` hands back a fresh
    // array reference every render, which would defeat the memo entirely.
    [context, rule?.pointsPerUnit, rule?.multiplier, rule?.bonusPoints],
  );

  return (
    <GivebackPanel
      result={result}
      {...panelProps({ context, onEditAverageOrderValue, title, hint })}
    />
  );
}

export function TiersGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
  title,
  hint,
}: Readonly<WrapperProps<TiersFormInput>>) {
  const tiersEnabled = useWatch({ control, name: "tiersEnabled" });
  const tiers = useWatch({ control, name: "tiers" });

  const key = JSON.stringify(
    (tiers ?? []).map((tier) => [tier.name, tier.pointsMultiplier, tier.color]),
  );

  const result = useMemo(
    () =>
      calculateGiveback({
        ...context,
        tiersEnabled: Boolean(tiersEnabled),
        tiers: (tiers ?? []).map((tier) => ({
          name: tier.name,
          threshold: toFiniteNumber(tier.threshold),
          pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
          color: tier.color,
        })),
      }),
    // `key` collapses the watched array into a stable string; `tiers` itself is a new
    // reference each render. It is read inside, so it is intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, tiersEnabled, key],
  );

  return (
    <GivebackPanel
      result={result}
      {...panelProps({ context, onEditAverageOrderValue, title, hint })}
    />
  );
}

export function RewardsGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
  title,
  hint,
}: Readonly<WrapperProps<RewardsFormInput>>) {
  const rewards = useWatch({ control, name: "rewards" });
  // The join and referral bonuses are edited on this step too, and they are part of what
  // the programme gives back — so the panel has to move when they do.
  const signupBonus = useWatch({ control, name: "signupBonus" });
  const referralBonus = useWatch({ control, name: "referralBonus" });
  const refereeBonus = useWatch({ control, name: "refereeBonus" });

  const key = JSON.stringify(
    (rewards ?? []).map((reward) => [reward.name, reward.pointsCost, reward.rewardValue]),
  );

  const result = useMemo(
    () =>
      calculateGiveback({
        ...context,
        bonuses: {
          signupBonus: toFiniteNumber(signupBonus),
          referralBonus: toFiniteNumber(referralBonus),
          refereeBonus: toFiniteNumber(refereeBonus),
        },
        rewards: (rewards ?? []).map((reward) => ({
          name: reward.name,
          pointsCost: toFiniteNumber(reward.pointsCost),
          rewardValue: reward.rewardValue as unknown,
        })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, key, signupBonus, referralBonus, refereeBonus],
  );

  return (
    <GivebackPanel
      result={result}
      {...panelProps({ context, onEditAverageOrderValue, title, hint })}
    />
  );
}
