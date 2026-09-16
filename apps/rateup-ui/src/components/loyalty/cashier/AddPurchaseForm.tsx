import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { LoyaltyEarningRule } from "@/backend/loyalty/earningRules.api";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";

import { formatMoney } from "../../dashboard/loyalty/giveback/format.ts";
import { estimateEarn } from "./points-estimate.ts";

const schema = z.object({
  amount: z.coerce.number().positive("What did they spend?"),
  note: z.string().trim().max(200).optional(),
});
export type AddPurchaseValues = z.infer<typeof schema>;

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
  onBack: () => void;
  onSubmit: (values: AddPurchaseValues) => void;
}

/**
 * Points preview before confirming: staff can read "43 Beans, balance 1,283" aloud before
 * touching the button, which is where trust at the counter comes from.
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
  onBack,
  onSubmit,
}: Readonly<AddPurchaseFormProps>) {
  const { t } = useTranslation();
  const form = useForm<z.input<typeof schema>, unknown, AddPurchaseValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" as unknown as number, note: "" },
  });

  const amount = Number(form.watch("amount"));
  const estimate = estimateEarn({ amount, rules, tier, tiersEnabled, tierId: tier?.id });
  const newBalance = currentPoints + (estimate?.points ?? 0);
  const affordable = rewardCosts.filter((cost) => cost <= newBalance).length;
  const money = (value: number) => formatMoney(value, currencyCode, currencySymbol);

  const mathLine = estimate
    ? [
        estimate.rule.isDefault
          ? t("{base} at {rate} per {symbol}1", {
              base: estimate.basePoints,
              rate:
                Number(estimate.rule.pointsPerUnit ?? 0) * Number(estimate.rule.multiplier ?? 1),
              symbol: currencySymbol,
            })
          : t("{base} under {rule}", { base: estimate.basePoints, rule: estimate.rule.name }),
        Number(estimate.rule.bonusPoints ?? 0) > 0
          ? t("+{bonus} flat", { bonus: estimate.rule.bonusPoints })
          : null,
        estimate.tierMultiplier !== 1 && tier
          ? t("then {tier} ×{mult}", { tier: tier.name, mult: estimate.tierMultiplier })
          : null,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{customerName}</p>
          <h2 className="text-base font-semibold text-foreground">{t("Add purchase")}</h2>
        </div>
      </div>

      <Controller
        control={form.control}
        name="amount"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("What did they spend?")}</FieldLabel>
            <InputGroup className="h-14 text-2xl">
              <InputGroupAddon className="text-xl">{currencySymbol}</InputGroupAddon>
              <InputGroupInput
                id={field.name}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                autoFocus
                className="text-2xl font-semibold tabular-nums"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value === undefined || field.value === null ? "" : String(field.value)}
                onChange={(event) => field.onChange(event.target.value)}
              />
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        {estimate ? (
          <>
            <p className="text-2xl font-semibold text-foreground">
              <span className="text-green-700 dark:text-green-500">
                +{estimate.points.toLocaleString()}
              </span>{" "}
              <span className="text-base font-normal text-muted-foreground">{pointsName}</span>
            </p>
            {mathLine && <p className="text-xs text-muted-foreground">{mathLine}</p>}
            <p className="mt-1 text-sm text-foreground">
              {t("Balance becomes {balance} {points}", {
                balance: newBalance.toLocaleString(),
                points: pointsName,
              })}
              {affordable > 0
                ? ` — ${affordable === 1 ? t("enough for one reward") : t("enough for {count} rewards", { count: affordable })}`
                : ""}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("Estimate — the receipt shows the exact figure.")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {rules.length === 0
              ? t("No earning rule is set up, so this purchase earns nothing.")
              : t("Enter the amount to see what it earns.")}
          </p>
        )}
      </div>

      <Controller
        control={form.control}
        name="note"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>{t("Note (optional)")}</FieldLabel>
            <Input
              id={field.name}
              placeholder={t("Bill 8842")}
              {...field}
              value={field.value ?? ""}
            />
          </Field>
        )}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" className="h-12" onClick={onBack} disabled={isSaving}>
          {t("Cancel")}
        </Button>
        <Button type="submit" className="h-12" disabled={isSaving || !estimate}>
          {isSaving
            ? t("Giving…")
            : estimate
              ? t("Give {points} {name}", {
                  points: estimate.points.toLocaleString(),
                  name: pointsName,
                })
              : t("Give {name}", { name: pointsName })}
        </Button>
      </div>
      {amount > 0 && !estimate && <p className="text-xs text-muted-foreground">{money(amount)}</p>}
    </form>
  );
}
