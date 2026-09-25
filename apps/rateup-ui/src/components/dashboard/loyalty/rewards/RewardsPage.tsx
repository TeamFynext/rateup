import { IconGift, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import type { LoyaltyRewardType } from "@/backend/loyalty/reward.api";
import {
  useLoyaltyRewards,
  useToggleLoyaltyRewardStatusMutation,
} from "@/backend/loyalty/reward.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tier.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { docsPath } from "@/utils/constants.ts";

import { calculateGiveback } from "../giveback/calculateGiveback.ts";
import { GivebackPanel } from "../giveback/GivebackPanel.tsx";
import { useProgrammeGiveback } from "../giveback/useProgrammeGiveback.ts";
import { useRewardEconomicsContext } from "../giveback/useRewardEconomicsContext.ts";
import { BonusesStrip } from "./BonusesStrip.tsx";
import { REWARD_KIND_ORDER, rewardKindMeta } from "./rewardKinds.ts";
import { RewardTile } from "./RewardTile.tsx";
import { RewardTypePicker } from "./RewardTypePicker.tsx";
import { useDeleteReward } from "./useDeleteReward.ts";

type TypeFilter = LoyaltyRewardType | "all";
type StatusFilter = "all" | "on" | "off";

/** Every reward as a card, tagged with its type, behind one Create button. */
export function RewardsPage() {
  const { t } = useTranslation();
  const { data: rewards, isLoading } = useLoyaltyRewards();
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useSubscription();
  const { data: program } = useLoyaltyProgram();
  const { data: tiers } = useLoyaltyTiers();
  const economics = useRewardEconomicsContext();
  const programmeGiveback = useProgrammeGiveback();
  const toggle = useToggleLoyaltyRewardStatusMutation();
  const { deleteReward } = useDeleteReward();

  const [picking, setPicking] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!subscriptionLoading && !subscription?.features?.whatsapp?.active) {
    return <ErrorComponent refetch={refetch} />;
  }

  const all = rewards ?? [];
  const kinds = rewardKindMeta(t, economics.pointsName);
  const presentTypes = REWARD_KIND_ORDER.filter((type) => all.some((r) => r.rewardType === type));
  const hasInactive = all.some((r) => r.status !== "ACTIVE");
  const hasPointRewards = all.some((r) => r.rewardType === "point");

  const visible = all
    .filter((r) => typeFilter === "all" || r.rewardType === typeFilter)
    .filter((r) => statusFilter === "all" || (statusFilter === "on") === (r.status === "ACTIVE"))
    .toSorted(
      (a, b) =>
        Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE") ||
        REWARD_KIND_ORDER.indexOf(a.rewardType) - REWARD_KIND_ORDER.indexOf(b.rewardType),
    );

  const typeItems = [
    { value: "all", label: t("All types") },
    ...presentTypes.map((type) => ({ value: type, label: kinds[type].label })),
  ];
  const statusItems = [
    { value: "all", label: t("On and off") },
    { value: "on", label: t("On") },
    { value: "off", label: t("Off") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={t("Rewards")}
        description={t(
          "What customers can spend their {points} on, and what they get for joining.",
          {
            points: economics.pointsName,
          },
        )}
        actions={
          <div className="flex items-center gap-2">
            <InfoButton docUrl={`${docsPath}/loyality/rewards`} />
            <Button onClick={() => setPicking(true)}>
              <IconPlus data-icon="inline-start" />
              {t("Create reward")}
            </Button>
          </div>
        }
      />

      {hasPointRewards && (
        <GivebackPanel
          result={calculateGiveback(programmeGiveback)}
          currencySymbol={programmeGiveback.currencySymbol}
          currencyCode={programmeGiveback.currencyCode}
          pointsName={programmeGiveback.pointsName}
          averageOrderValue={programmeGiveback.averageOrderValue}
        />
      )}

      {program && (
        <BonusesStrip
          program={program}
          gifts={all.filter((r) => r.rewardType === "assigned")}
          pointsName={economics.pointsName}
        />
      )}

      {(presentTypes.length > 1 || hasInactive) && (
        <div className="flex flex-wrap items-center gap-2">
          {presentTypes.length > 1 && (
            <Select
              value={typeFilter}
              items={typeItems}
              onValueChange={(value) => setTypeFilter(asTypeFilter(value))}
            >
              <SelectTrigger className="w-40" aria-label={t("Type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasInactive && (
            <Select
              value={statusFilter}
              items={statusItems}
              onValueChange={(value) =>
                setStatusFilter(value === "on" || value === "off" ? value : "all")
              }
            >
              <SelectTrigger className="w-36" aria-label={t("Status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">
            {t("{shown} of {total}", { shown: visible.length, total: all.length })}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconGift />
            </EmptyMedia>
            <EmptyTitle>{t("No rewards yet")}</EmptyTitle>
            <EmptyDescription>
              {t("Customers can still earn {points}, but they have nothing to spend them on.", {
                points: economics.pointsName,
              })}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setPicking(true)}>
              <IconPlus data-icon="inline-start" />
              {t("Create reward")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : visible.length === 0 ? (
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("Nothing matches these filters")}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              {t("Show all rewards")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((reward) => (
            <RewardTile
              key={reward.id}
              reward={reward}
              tiers={tiers ?? []}
              economics={economics}
              onToggle={(active) =>
                toggle.mutate({ rewardId: reward.id, status: active ? "ACTIVE" : "INACTIVE" })
              }
              onDelete={() => void deleteReward(reward)}
            />
          ))}
        </div>
      )}

      <RewardTypePicker
        open={picking}
        onOpenChange={setPicking}
        pointsName={economics.pointsName}
      />
    </div>
  );
}

function asTypeFilter(value: string | null): TypeFilter {
  return REWARD_KIND_ORDER.find((type) => type === value) ?? "all";
}
