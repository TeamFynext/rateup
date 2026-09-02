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
}

function panelProps(context: GivebackContext, onEditAverageOrderValue?: () => void) {
  return {
    currencySymbol: context.currencySymbol,
    currencyCode: context.currencyCode,
    pointsName: context.pointsName,
    averageOrderValue: context.averageOrderValue,
    onEditAverageOrderValue,
  };
}

export function EarningGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
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

  return <GivebackPanel result={result} {...panelProps(context, onEditAverageOrderValue)} />;
}

export function TiersGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
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

  return <GivebackPanel result={result} {...panelProps(context, onEditAverageOrderValue)} />;
}

export function RewardsGivebackPanel({
  control,
  context,
  onEditAverageOrderValue,
}: Readonly<WrapperProps<RewardsFormInput>>) {
  const rewards = useWatch({ control, name: "rewards" });

  const key = JSON.stringify(
    (rewards ?? []).map((reward) => [reward.name, reward.pointsCost, reward.rewardValue]),
  );

  const result = useMemo(
    () =>
      calculateGiveback({
        ...context,
        rewards: (rewards ?? []).map((reward) => ({
          name: reward.name,
          pointsCost: toFiniteNumber(reward.pointsCost),
          rewardValue: reward.rewardValue as unknown,
        })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, key],
  );

  return <GivebackPanel result={result} {...panelProps(context, onEditAverageOrderValue)} />;
}
