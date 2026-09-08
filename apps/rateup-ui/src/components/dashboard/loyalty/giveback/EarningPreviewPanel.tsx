import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import {
  pointsEarned,
  previewAmounts,
  tierPreviewRows,
  type PreviewEarnRate,
  type PreviewTier,
} from "./earningPreview.ts";
import { formatMoney, formatPoints } from "./format.ts";

export interface EarningPreviewPanelProps {
  earnRate: PreviewEarnRate;
  tiers?: readonly PreviewTier[];
  tiersEnabled?: boolean;
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
  averageOrderValue: number | null;
  /** Sends the user back to where the typical order value is set. */
  onEditAverageOrderValue?: () => void;
  title?: string;
  hint?: string;
}

/**
 * What a purchase earns, before any reward exists to value it against. The giveback
 * percentage needs rewards; this rail needs only the rate the merchant is typing and the
 * typical order value, so it can sit beside the Earning and Tiers forms honestly.
 */
export function EarningPreviewPanel({
  earnRate,
  tiers = [],
  tiersEnabled = false,
  currencySymbol,
  currencyCode,
  pointsName,
  averageOrderValue,
  onEditAverageOrderValue,
  title,
  hint,
}: Readonly<EarningPreviewPanelProps>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(amount, currencyCode, currencySymbol);
  const heading = title ?? t("Earning preview");

  if (averageOrderValue === null || averageOrderValue <= 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-start gap-2.5 p-4">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{heading}</p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Tell us roughly what a customer spends in one visit and we can show what they earn.",
              )}
            </p>
            {onEditAverageOrderValue && (
              <button
                type="button"
                onClick={onEditAverageOrderValue}
                className="self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Set a typical order value")}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const rate = earnRate.pointsPerUnit * (earnRate.multiplier || 1);
  const typical = pointsEarned(averageOrderValue, earnRate);
  const rows = previewAmounts(averageOrderValue);
  const tierRows = tiersEnabled ? tierPreviewRows(averageOrderValue, earnRate, tiers) : [];

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{heading}</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatPoints(typical, pointsName)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("for a {amount} purchase", { amount: money(averageOrderValue) })}
            {onEditAverageOrderValue && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onEditAverageOrderValue}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("Change")}
                </button>
              </>
            )}
          </p>
        </div>
        {hint && <p className="-mt-3 text-xs text-muted-foreground">{hint}</p>}

        <p className="text-sm text-muted-foreground">
          {rate > 0
            ? t("{rate} for every {symbol}1 spent.", {
                rate: formatPoints(Number(rate.toFixed(4)), pointsName),
                symbol: currencySymbol,
              })
            : t("Nothing is earned on a purchase yet.")}
          {earnRate.bonusPoints > 0
            ? ` ${t("Plus {bonus} on every visit.", { bonus: formatPoints(earnRate.bonusPoints, pointsName) })}`
            : ""}
        </p>

        <dl className="flex flex-col gap-1.5 text-xs">
          {rows.map((amount) => (
            <div key={amount} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">
                {t("A {amount} order earns", { amount: money(amount) })}
              </dt>
              <dd className="font-medium text-foreground">
                {formatPoints(pointsEarned(amount, earnRate), pointsName)}
              </dd>
            </div>
          ))}
        </dl>

        {tierRows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">
              {t("The same {amount} order, tier by tier", { amount: money(averageOrderValue) })}
            </p>
            <ul className="flex flex-col gap-1">
              {tierRows.map((tier) => (
                <li key={tier.name} className="flex items-center gap-2 text-xs">
                  {tier.color && (
                    // Merchant-chosen hex, so it can only be a dynamic style value.
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                  )}
                  <span className="text-muted-foreground">{tier.name}</span>
                  <span className="text-muted-foreground">×{tier.pointsMultiplier}</span>
                  <span className="ml-auto font-medium text-foreground">
                    {formatPoints(tier.points, pointsName)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          {t("What this costs you depends on the rewards — see the Rewards step.")}
        </p>
      </CardContent>
    </Card>
  );
}
