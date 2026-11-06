import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";

import { formatPoints } from "../giveback/format.ts";
import { RewardWorthLine } from "../giveback/RewardWorthLine.tsx";
import type { RewardEconomicsContext } from "../giveback/useRewardEconomicsContext.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { rewardKindMeta } from "./rewardKinds.ts";
import { RewardTypeTag } from "./RewardTypeTag.tsx";

interface RewardTileProps {
  reward: LoyaltyReward;
  tiers: readonly LoyaltyTier[];
  economics: RewardEconomicsContext;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}

export function RewardTile({
  reward,
  tiers,
  economics,
  onToggle,
  onDelete,
}: Readonly<RewardTileProps>) {
  const { t } = useTranslation();
  const meta = rewardKindMeta(t, economics.pointsName)[reward.rewardType];
  const Icon = meta.icon;
  const active = reward.status === "ACTIVE";
  const isReview = reward.rewardType === "review";
  const gatedTiers = tiers.filter((tier) => reward.availableForTiers?.includes(tier.id));

  const editLink = isReview ? (
    <Link to={LOYALTY_PATHS.feedback} search={{ tab: "settings", page: 1 }} />
  ) : (
    <Link to={LOYALTY_PATHS.rewardEdit} params={{ rewardId: reward.id }} />
  );
  const titleClass = "line-clamp-2 font-medium leading-snug text-foreground hover:underline";

  return (
    <Card className={cn("h-full transition-colors", !active && "bg-muted/40")}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              meta.toneClass,
              !active && "opacity-60",
            )}
            aria-hidden="true"
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            {isReview ? (
              <Link
                to={LOYALTY_PATHS.feedback}
                search={{ tab: "settings", page: 1 }}
                className={titleClass}
              >
                {reward.name}
              </Link>
            ) : (
              <Link
                to={LOYALTY_PATHS.rewardEdit}
                params={{ rewardId: reward.id }}
                className={titleClass}
              >
                {reward.name}
              </Link>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <RewardTypeTag type={reward.rewardType} />
              {reward.status === "OUT_OF_STOCK" && (
                <Badge variant="destructive">{t("Out of stock")}</Badge>
              )}
              {reward.status === "EXPIRED" && <Badge variant="outline">{t("Expired")}</Badge>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("Actions for {name}", { name: reward.name })}
                />
              }
            >
              <IconDots />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem render={editLink}>
                <IconPencil />
                {isReview ? t("Manage in Feedback") : t("Edit")}
              </DropdownMenuItem>
              {!isReview && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <IconTrash />
                  {t("Delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {reward.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{reward.description}</p>
        )}

        <div className="mt-auto flex flex-col gap-3">
          <RewardFacts reward={reward} economics={economics} />

          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {gatedTiers.length > 0 ? (
                <>
                  {gatedTiers.slice(0, 3).map((tier) => (
                    <span
                      key={tier.id}
                      className="size-3 shrink-0 rounded-full border border-background"
                      style={{ backgroundColor: tier.color }}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="truncate">{gatedTiers.map((tier) => tier.name).join(", ")}</span>
                </>
              ) : (
                <span>{t("All members")}</span>
              )}
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              {active ? t("On") : t("Off")}
              <Switch
                checked={active}
                onCheckedChange={onToggle}
                aria-label={t("Offer {name} to customers", { name: reward.name })}
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** The one line that matters for each type: its price, its code, or how many are left. */
function RewardFacts({
  reward,
  economics,
}: Readonly<{ reward: LoyaltyReward; economics: RewardEconomicsContext }>) {
  const { t } = useTranslation();
  const used = reward.stockRedeemed || 0;

  if (reward.rewardType === "point") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-lg font-bold leading-none">
          {formatPoints(reward.pointsCost || 0, economics.pointsName)}
        </span>
        <RewardWorthLine
          className="truncate text-xs"
          rewardValue={reward.rewardValue}
          pointsCost={reward.pointsCost || 0}
          earnRate={economics.earnRate}
          averageOrderValue={economics.averageOrderValue}
          currencySymbol={economics.currencySymbol}
          currencyCode={economics.currencyCode}
        />
        <span className="text-xs text-muted-foreground">
          {t("{count} redeemed", { count: used })}
        </span>
      </div>
    );
  }

  if (reward.rewardType === "coupon") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {reward.rewardValue?.code ? (
          <Badge variant="outline" className="font-mono">
            {reward.rewardValue.code}
          </Badge>
        ) : (
          <span>{t("A new code for each customer")}</span>
        )}
        <span>{t("{used} of {total} used", { used, total: reward.stockQuantity || "∞" })}</span>
      </div>
    );
  }

  if (reward.rewardType === "assigned") {
    return (
      <span className="text-xs text-muted-foreground">
        {t("{used} of {total} given out", { used, total: reward.stockQuantity || 0 })}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted-foreground">
      {t("Granted once per customer for a Google review")}
    </span>
  );
}
