import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils.ts";

import { rewardEconomics } from "./calculateGiveback";
import { formatMoney, formatPercent } from "./format";

export interface RewardWorthLineProps {
  rewardValue: unknown;
  pointsCost: number;
  /** The default earning rule — what a customer earns per currency unit spent. */
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
  currencySymbol: string;
  currencyCode: string;
  /** "chip" is the compact list-row form; "inline" is the sentence under a field. */
  variant?: "inline" | "chip";
  className?: string;
}

/**
 * What one reward actually costs, in money.
 *
 * "5% off for 100 points" tells a merchant nothing on its own. At 1 point per unit and a
 * typical order of 250 it is 12.50 of value handed over for 100 of spend — 12.5% back.
 * This renders that sentence wherever a reward is defined or listed, and colours it with
 * the same bands the programme-wide panel uses, so a reward and the total can never
 * disagree about what "too generous" means.
 */
export function RewardWorthLine({
  rewardValue,
  pointsCost,
  earnRate,
  averageOrderValue,
  currencySymbol,
  currencyCode,
  variant = "inline",
  className,
}: Readonly<RewardWorthLineProps>) {
  const { t } = useTranslation();

  const economics = rewardEconomics({ rewardValue, pointsCost, earnRate, averageOrderValue });

  // Coupons and assigned gifts are not bought with points, so there is nothing to say.
  if (economics.skipReason === "no_points_cost") return null;

  const tone =
    economics.band === "excessive"
      ? "text-destructive"
      : economics.band === "generous"
        ? "text-amber-700 dark:text-amber-500"
        : "text-muted-foreground";

  const money = (amount: number) => formatMoney(amount, currencyCode, currencySymbol);

  if (economics.worth === null) {
    const needsAov = economics.dependsOnAov || averageOrderValue === null;
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {needsAov && economics.skipReason === "no_monetary_value" && averageOrderValue === null
          ? t("Set a typical order value to see what this costs you")
          : t("No value set — this reward is not counted in your program cost")}
      </span>
    );
  }

  const worth = money(round(economics.worth));

  if (variant === "chip") {
    return (
      <span
        className={cn(
          "rounded border border-border px-2 py-1 text-xs font-medium",
          tone,
          className,
        )}
        title={
          economics.givebackPct === null
            ? undefined
            : t("{pct} of what a customer spends to earn it", {
                pct: formatPercent(economics.givebackPct),
              })
        }
      >
        {t("≈{worth}", { worth })}
      </span>
    );
  }

  // Without an earn rate there is no spend to divide by, so the worth stands alone
  // rather than producing an Infinity.
  if (economics.spendToEarn === null || economics.givebackPct === null) {
    return (
      <span className={cn("text-xs", tone, className)}>{t("Worth about {worth}", { worth })}</span>
    );
  }

  return (
    <span className={cn("text-xs", tone, className)}>
      {t("Worth about {worth} · a customer spends {spend} to earn it · {pct} back", {
        worth,
        spend: money(Math.round(economics.spendToEarn)),
        pct: formatPercent(economics.givebackPct),
      })}
      {economics.dependsOnAov && averageOrderValue !== null && (
        <span className="text-muted-foreground">
          {" "}
          {t("(on a {aov} order)", { aov: money(averageOrderValue) })}
        </span>
      )}
    </span>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
