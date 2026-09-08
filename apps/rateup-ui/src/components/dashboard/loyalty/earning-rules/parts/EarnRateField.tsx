import { IconArrowRight } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";

import { formatMoney } from "../../giveback/format.ts";
import { earnPairFromRate, pointsFor, rateFromEarnPair, sameRate } from "./earnRate.ts";

interface EarnRateFieldProps {
  id: string;
  /** The stored `pointsPerUnit`; anything not a finite number reads as unset. */
  value: unknown;
  onChange: (pointsPerUnit: number) => void;
  onBlur?: () => void;
  currencySymbol: string;
  currencyCode?: string;
  pointsName: string;
  /** Typical spend in one visit; when known, the field shows what that purchase earns. */
  averageOrderValue?: number | null;
  label?: string;
  description?: string;
  invalid?: boolean;
  error?: { message?: string } | undefined;
  disabled?: boolean;
}

function toRate(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * The earn rate as a sentence a merchant would say — "spend ₹100, earn 10 points" — that
 * writes `pointsPerUnit` behind the scenes. Both numbers are the merchant's; the rate is
 * shown underneath with the example purchase so the arithmetic is never a surprise.
 */
export function EarnRateField({
  id,
  value,
  onChange,
  onBlur,
  currencySymbol,
  currencyCode,
  pointsName,
  averageOrderValue,
  label,
  description,
  invalid,
  error,
  disabled,
}: Readonly<EarnRateFieldProps>) {
  const { t } = useTranslation();
  const rate = toRate(value);
  const [pair, setPair] = useState(() => {
    const initial = earnPairFromRate(rate);
    return { spend: String(initial.spend), points: String(initial.points) };
  });

  // A reset from outside (the form reloads, another editor saved) re-derives the pair;
  // the merchant's own typing never does, so "₹200 = 20" is not rewritten as "₹10 = 1".
  useEffect(() => {
    const current = { spend: Number(pair.spend), points: Number(pair.points) };
    if (sameRate(rate, current)) return;
    const next = earnPairFromRate(rate);
    setPair({ spend: String(next.spend), points: String(next.points) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the stored rate drives this
  }, [rate]);

  const update = (next: { spend: string; points: string }) => {
    setPair(next);
    const spend = Number(next.spend);
    const points = Number(next.points);
    if (spend > 0 && points >= 0) onChange(rateFromEarnPair(spend, points));
  };

  const money = (amount: number) =>
    currencyCode ? formatMoney(amount, currencyCode, currencySymbol) : `${currencySymbol}${amount}`;
  const example =
    averageOrderValue && averageOrderValue > 0
      ? t("A {amount} purchase earns {points} {name}.", {
          amount: money(averageOrderValue),
          points: pointsFor(averageOrderValue, rate).toLocaleString(),
          name: pointsName,
        })
      : null;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={`${id}-spend`} className="text-xs">
        {label ?? t("How customers earn")}
      </FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("Spend")}</span>
        <InputGroup className="w-36">
          <InputGroupAddon>{currencySymbol}</InputGroupAddon>
          <InputGroupInput
            id={`${id}-spend`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={pair.spend}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => update({ ...pair, spend: event.target.value })}
            onBlur={onBlur}
          />
        </InputGroup>
        <IconArrowRight size={14} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("earn")}</span>
        <InputGroup className="w-40">
          <InputGroupInput
            id={`${id}-points`}
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={pair.points}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => update({ ...pair, points: event.target.value })}
            onBlur={onBlur}
          />
          <InputGroupAddon align="inline-end">{pointsName}</InputGroupAddon>
        </InputGroup>
      </div>
      <FieldDescription className="text-xs">
        {rate > 0
          ? t("That is {rate} {name} per {symbol}1.", {
              rate: Number(rate.toFixed(4)).toLocaleString(),
              name: pointsName,
              symbol: currencySymbol,
            })
          : t("Nothing is earned yet — fill in both numbers.")}
        {example ? ` ${example}` : ""}
        {description ? ` ${description}` : ""}
      </FieldDescription>
      {invalid && error && <FieldError errors={[error]} />}
    </Field>
  );
}
