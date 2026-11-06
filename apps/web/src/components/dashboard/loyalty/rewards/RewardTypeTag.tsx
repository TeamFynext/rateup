import { useTranslation } from "react-i18next";

import type { LoyaltyRewardType } from "@/backend/loyalty/reward.api";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

import { useRewardEconomicsContext } from "../giveback/useRewardEconomicsContext.ts";
import { rewardKindMeta } from "./rewardKinds.ts";

export function RewardTypeTag({ type }: Readonly<{ type: LoyaltyRewardType }>) {
  const { t } = useTranslation();
  const { pointsName } = useRewardEconomicsContext();
  const meta = rewardKindMeta(t, pointsName)[type];
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={cn("gap-1", meta.toneClass)}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
