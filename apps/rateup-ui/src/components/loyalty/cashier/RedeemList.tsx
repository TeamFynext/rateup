import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { CustomerReward } from "@/backend/loyalty/cashier/cashier.api";
import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

export interface RedeemRow {
  reward: LoyaltyReward;
  eligible: boolean;
  /** Why it is greyed: how far off, or which tiers only. */
  note: string;
}

interface RedeemListProps {
  customerName: string;
  currentPoints: number;
  pointsName: string;
  /** Every live reward, so greyed rows still say how far off they are. */
  catalogue: LoyaltyReward[];
  /** The rewards this customer may actually redeem right now (tier-filtered by the API). */
  available: CustomerReward[];
  tierNames: Map<string, string>;
  /** Points a typical visit earns; null when the programme has no typical spend. */
  pointsPerVisit: number | null;
  redeemingId: string | null;
  onBack: () => void;
  onRedeem: (reward: LoyaltyReward) => void;
}

/**
 * Affordable first. Greyed rewards say how far off she is, so staff have something
 * encouraging to read out instead of "no".
 */
export function RedeemList({
  customerName,
  currentPoints,
  pointsName,
  catalogue,
  available,
  tierNames,
  pointsPerVisit,
  redeemingId,
  onBack,
  onRedeem,
}: Readonly<RedeemListProps>) {
  const { t } = useTranslation();
  const availableIds = new Set(available.map((r) => r.id));

  const rows: RedeemRow[] = catalogue
    .filter((reward) => reward.status === "ACTIVE" && reward.rewardType !== "assigned")
    .map((reward) => {
      const restricted = reward.availableForTiers?.length > 0;
      const inTier = !restricted || availableIds.has(reward.id);
      const affordable = reward.pointsCost <= currentPoints;
      const eligible =
        inTier &&
        affordable &&
        (reward.rewardType === "coupon" || availableIds.has(reward.id) || !restricted);

      let note: string;
      if (!inTier) {
        const names = (reward.availableForTiers ?? []).map((id) => tierNames.get(id) ?? id);
        note = t("{tiers} only", { tiers: names.join(" & ") });
      } else if (!affordable) {
        const short = reward.pointsCost - currentPoints;
        const visits =
          pointsPerVisit && pointsPerVisit > 0 ? Math.ceil(short / pointsPerVisit) : null;
        note =
          visits !== null
            ? t("{short} {points} short — about {visits} more visits", {
                short: short.toLocaleString(),
                points: pointsName,
                visits,
              })
            : t("{short} {points} short", { short: short.toLocaleString(), points: pointsName });
      } else if (reward.pointsCost === 0) {
        note = t("No {points} needed", { points: pointsName });
      } else {
        note = t("{cost} {points} · leaves {left}", {
          cost: reward.pointsCost.toLocaleString(),
          points: pointsName,
          left: (currentPoints - reward.pointsCost).toLocaleString(),
        });
      }
      return { reward, eligible, note };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) || a.reward.pointsCost - b.reward.pointsCost,
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("Back")}>
          <IconArrowLeft size={18} />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">{customerName}</p>
          <h2 className="text-base font-semibold text-foreground">{t("Redeem a reward")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("{points} {name} available", {
              points: currentPoints.toLocaleString(),
              name: pointsName,
            })}
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("No rewards are set up yet.")}</p>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map(({ reward, eligible, note }) => (
          <li
            key={reward.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border p-3",
              eligible ? "bg-card" : "bg-muted/40 opacity-80",
            )}
          >
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  eligible ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {reward.name}
              </p>
              <p
                className={cn(
                  "text-xs",
                  eligible ? "text-muted-foreground" : "text-amber-700 dark:text-amber-500",
                )}
              >
                {note}
              </p>
            </div>
            {eligible ? (
              <Button
                size="sm"
                variant={reward.pointsCost >= 500 ? "default" : "outline"}
                onClick={() => onRedeem(reward)}
                disabled={redeemingId !== null}
              >
                {redeemingId === reward.id ? t("Redeeming…") : t("Redeem")}
              </Button>
            ) : (
              <IconLock size={16} className="shrink-0 text-muted-foreground/60" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
