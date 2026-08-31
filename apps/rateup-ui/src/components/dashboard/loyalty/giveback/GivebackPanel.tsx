import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { givebackBand, type GivebackBand, type GivebackResult } from "./calculateGiveback";
import { formatMoney, formatPercent, formatPoints, singularPoints } from "./format";

export interface GivebackPanelProps {
  result: GivebackResult;
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
  averageOrderValue: number | null;
  /** Sends the user back to where the typical order value is set. */
  onEditAverageOrderValue?: () => void;
}

/**
 * What this programme costs, in one number.
 *
 * The headline is deliberately a maximum — it values points at the most generous reward
 * in the catalog, because a customer redeeming rationally picks that one, and a single
 * mispriced reward is the accident this panel exists to catch. The range underneath
 * shows the floor, and the footnote states the assumption out loud.
 */
export function GivebackPanel({
  result,
  currencySymbol,
  currencyCode,
  pointsName,
  averageOrderValue,
  onEditAverageOrderValue,
}: Readonly<GivebackPanelProps>) {
  const { t } = useTranslation();

  const money = (amount: number) => formatMoney(amount, currencyCode, currencySymbol);

  if (result.status !== "ok") {
    return (
      <Card className="border-border">
        <CardContent className="flex items-start gap-2.5 p-4">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{t("What your program costs")}</p>
            <p className="text-xs text-muted-foreground">{emptyStateMessage(result.status, t)}</p>
            {result.status === "needs_average_order_value" && onEditAverageOrderValue && (
              <button
                type="button"
                onClick={onEditAverageOrderValue}
                className="self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Set a typical order value")}
              </button>
            )}
            <SkippedRewards result={result} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // The headline is the true upper bound: the best-value reward, earned in the most
  // generous tier. `givebackPct` stays the base-rate figure, shown beside it as the floor
  // of the tier range so the two numbers are never confused for each other.
  const pct = result.givebackPctTop ?? result.givebackPct ?? 0;
  const basePct = result.givebackPct ?? 0;
  const topTier = result.topTier;
  const showTierRange = topTier !== null && Math.abs(pct - basePct) > 0.05;
  const best = result.bestReward;
  // Both ends of this range are base-rate: it isolates the spread between the cheapest and
  // the most generous reward, which mixing in a tier multiplier would blur.
  const showRange =
    result.givebackPctFloor !== null &&
    result.valuedRewards.length > 1 &&
    Math.abs(basePct - result.givebackPctFloor) > 0.05;

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div>
            <p className="text-xs text-muted-foreground">{t("Your program gives back")}</p>
            <p className="text-2xl font-semibold text-foreground">
              {t("up to {pct} of revenue", { pct: formatPercent(pct) })}
            </p>
          </div>
          <BandBadge band={result.band} />
        </div>

        {showTierRange && topTier && (
          <p className="-mt-2 text-xs text-muted-foreground">
            {t("Base rate {base} — {tier} members {top}", {
              base: formatPercent(basePct),
              tier: topTier.name,
              top: formatPercent(topTier.givebackPct),
            })}
          </p>
        )}

        {/* The arithmetic in words — a number nobody can retrace is a number nobody trusts. */}
        {best && (
          <p className="text-sm text-muted-foreground">
            {t(
              "{rate} for every {symbol}1 spent. {cost} buys {reward}, worth {worth} — so each {point} is worth {pointValue}.",
              {
                rate: formatPoints(result.pointsPerCurrencyUnit, pointsName),
                symbol: currencySymbol,
                cost: formatPoints(best.pointsCost, pointsName),
                reward: best.name,
                worth: money(best.worth),
                point: singularPoints(pointsName),
                pointValue: money(round(best.valuePerPoint)),
              },
            )}
          </p>
        )}

        <dl className="flex flex-col gap-1.5 text-xs">
          {showRange && result.givebackPctFloor !== null && (
            <Row
              label={t("Depending on the reward")}
              value={t("{floor} – {best}", {
                floor: formatPercent(result.givebackPctFloor),
                best: formatPercent(basePct),
              })}
            />
          )}

          {result.flatBonusPct !== null && result.flatBonusPct > 0 && (
            <Row
              label={t("Of which the flat per-visit bonus")}
              value={formatPercent(result.flatBonusPct)}
            />
          )}

          {averageOrderValue !== null && result.pointsPerOrder !== null && (
            <Row
              label={t("A {aov} order earns", { aov: money(averageOrderValue) })}
              value={formatPoints(Math.floor(result.pointsPerOrder), pointsName)}
              action={
                onEditAverageOrderValue && (
                  <button
                    type="button"
                    onClick={onEditAverageOrderValue}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t("Change")}
                  </button>
                )
              }
            />
          )}
        </dl>

        {result.perTier.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">
              {t("For a customer sitting in each tier")}
            </p>
            <ul className="flex flex-col gap-1">
              {result.perTier.map((tier) => (
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
                    {formatPercent(tier.givebackPct)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* One-time costs stay out of the percentage: they amortise over a customer's
            lifetime, not per order, so averaging them in would be arithmetically wrong. */}
        {result.oneTimeCosts &&
          (result.oneTimeCosts.perNewMember !== null ||
            result.oneTimeCosts.perReferralPair !== null) && (
            <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-xs">
              {result.oneTimeCosts.perNewMember !== null && (
                <Row
                  label={t("One-off cost to sign a member up")}
                  value={money(round(result.oneTimeCosts.perNewMember))}
                />
              )}
              {result.oneTimeCosts.perReferralPair !== null && (
                <Row
                  label={t("One-off cost per referral")}
                  value={money(round(result.oneTimeCosts.perReferralPair))}
                />
              )}
            </dl>
          )}

        <SkippedRewards result={result} />

        {(result.band === "generous" || result.band === "excessive") && (
          <Alert variant={result.band === "excessive" ? "destructive" : "default"}>
            <IconAlertTriangle
              className={
                result.band === "excessive" ? undefined : "text-amber-600 dark:text-amber-500"
              }
            />
            <AlertTitle>{alertTitle(result.band, topTier, t)}</AlertTitle>
            <AlertDescription>
              {describeBand({
                band: result.band,
                pct,
                basePct,
                topTier,
                currencySymbol,
                rewardName: best?.name ?? "",
                t,
              })}
            </AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          {t(
            "Assumes every point is redeemed, for the best-value reward. What you actually pay is usually lower.",
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  action,
}: Readonly<{ label: string; value: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto flex items-baseline gap-2 font-medium text-foreground">
        {value}
        {action}
      </dd>
    </div>
  );
}

function BandBadge({ band }: Readonly<{ band: GivebackBand }>) {
  const { t } = useTranslation();

  if (band === "unknown") return null;
  if (band === "excessive") return <Badge variant="destructive">{t("Too generous")}</Badge>;
  if (band === "generous") {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
      >
        {t("Generous")}
      </Badge>
    );
  }
  if (band === "low") return <Badge variant="secondary">{t("Modest")}</Badge>;
  return (
    <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
      {t("In line with most programs")}
    </Badge>
  );
}

/** Named so the merchant knows the estimate is incomplete and how to complete it. */
function SkippedRewards({ result }: Readonly<{ result: GivebackResult }>) {
  const { t } = useTranslation();

  const unpriced = result.skippedRewards.filter((r) => r.reason !== "no_points_cost");
  if (unpriced.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 text-xs">
      <p className="text-muted-foreground">
        {t("Not counted, because no value is set:")}{" "}
        <span className="text-foreground">{unpriced.map((r) => r.name).join(", ")}</span>
      </p>
    </div>
  );
}

function emptyStateMessage(status: GivebackResult["status"], t: (key: string) => string): string {
  if (status === "needs_average_order_value") {
    return t(
      "Tell us roughly what a customer spends in one visit and we can show what your program costs you.",
    );
  }
  if (status === "no_earning") {
    return t("Customers earn nothing on a purchase right now, so the program costs you nothing.");
  }
  return t("Add a reward with a value to see what your program costs you.");
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * The band is judged at the top tier, so when a tier is what crosses the line the copy has
 * to say so — otherwise it reads as an accusation about a base rate that is perfectly fine,
 * and the merchant edits the wrong number.
 */
function alertTitle(band: GivebackBand, topTier: GivebackResult["topTier"], t: Translate): string {
  if (band === "excessive") {
    return topTier
      ? t("{tier} costs more than most businesses can absorb", { tier: topTier.name })
      : t("More than most businesses can absorb");
  }
  return topTier
    ? t("{tier} is more generous than most programs", { tier: topTier.name })
    : t("More generous than most programs");
}

function describeBand({
  band,
  pct,
  basePct,
  topTier,
  currencySymbol,
  rewardName,
  t,
}: Readonly<{
  band: GivebackBand;
  pct: number;
  basePct: number;
  topTier: GivebackResult["topTier"];
  currencySymbol: string;
  rewardName: string;
  t: Translate;
}>): string {
  // A tier only deserves the blame when it is doing the damage on its own — a base rate
  // already past the line is not the tier's fault, and pointing at the tier would send the
  // merchant to fix a number that is not the problem.
  const tierIsTheCause = topTier !== null && givebackBand(basePct) !== band;

  if (band === "excessive") {
    if (tierIsTheCause && topTier) {
      return t(
        "{tier} members earn {mult}x, which gives back {pct} of what they spend — likely more than your margin on a sale. Lower {tier}'s multiplier, or raise the cost of {reward}.",
        {
          tier: topTier.name,
          mult: topTier.pointsMultiplier,
          pct: formatPercent(pct),
          reward: rewardName,
        },
      );
    }
    return t(
      "Giving back {pct} of revenue is likely more than your margin on a sale. Lower the points earned per {symbol}1, or raise the cost of {reward}.",
      { pct: formatPercent(pct), symbol: currencySymbol, reward: rewardName },
    );
  }

  if (tierIsTheCause && topTier) {
    return t(
      "Your base rate gives back {base}, but {tier} members earn {mult}x and give back {pct}. Fine if that is deliberate — most programs sit between 1% and 5%.",
      {
        base: formatPercent(basePct),
        tier: topTier.name,
        mult: topTier.pointsMultiplier,
        pct: formatPercent(pct),
      },
    );
  }
  return t("Fine if that is deliberate. Most programs sit between 1% and 5%.");
}

/** Point values are fractions of a currency unit; two decimals is the useful precision. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
