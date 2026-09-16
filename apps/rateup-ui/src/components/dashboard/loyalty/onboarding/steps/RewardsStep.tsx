import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalculator, IconCrown, IconGift } from "@tabler/icons-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider";

import { toFiniteNumber } from "../../giveback/calculateGiveback.ts";
import {
  RewardExamplePicker,
  type RewardExamplePick,
} from "../../giveback/RewardExamplePicker.tsx";
import { RewardsGivebackPanel } from "../../giveback/StepGivebackPanels.tsx";
import { FALLBACK_POINTS_COST, suggestPointsCost } from "../../giveback/suggestPointsCost.ts";
import type { GivebackContext } from "../givebackContext.ts";
import {
  BASE_GROUP,
  groupRewardIndices,
  orderTiers,
  tiersForGroup,
  type RewardGroup as RewardGroupKey,
  type TierRef,
} from "../rewardGroups.ts";
import { blankRewardValue, toRewardValueRecord } from "../rewardValue.ts";
import {
  rewardsFormSchema,
  type RewardFormRow,
  type RewardsFormInput,
  type RewardsFormValues,
} from "../schemas.ts";
import {
  StepFooter,
  StepHeader,
  StepLayout,
  useStepFooterProps,
  type StepMode,
} from "../StepChrome.tsx";
import { BonusesCard } from "./rewards/BonusesCard.tsx";
import { ReadOnlyRewardRow } from "./rewards/ReadOnlyRewardRow.tsx";
import { RewardGroup } from "./rewards/RewardGroup.tsx";
import { RewardRow } from "./rewards/RewardRow.tsx";

interface RewardsStepProps {
  defaultValues: RewardsFormInput;
  pointsName: string;
  giveback: GivebackContext;
  isSaving: boolean;
  mode?: StepMode;
  onBack?: () => void;
  onCancel?: () => void;
  onEditAverageOrderValue: () => void;
  onSubmit: (values: RewardsFormValues) => void;
  railExtra?: React.ReactNode;
  /** Tiers a reward can be restricted to. Values are whatever `availableForTiers` stores. */
  tierOptions?: ReadonlyArray<{ value: string; label: string }>;
  /**
   * The tiers above the base, when the programme has any. Each gets its own band: a reward
   * gated on a tier is shown under the lowest tier it names, and one added into a band is
   * gated on that tier and every tier above it.
   */
  upperTiers?: readonly TierRef[];
  /** Where coupons and free gifts — kinds this form only lists — are created and edited. */
  advancedEditorHref?: React.ReactNode;
}

type RewardKindFilter = "all" | "point" | "coupon" | "assigned";

/**
 * Rewards in bands: for everyone, then one per tier above the base. All are the same field
 * array — the band a row sits in is read off `availableForTiers` — so re-pricing, removal
 * and the giveback estimate see one list.
 */
export function RewardsStep({
  defaultValues,
  pointsName,
  giveback,
  isSaving,
  mode = "wizard",
  onBack,
  onCancel,
  onEditAverageOrderValue,
  onSubmit,
  railExtra,
  tierOptions = [],
  upperTiers = [],
  advancedEditorHref,
}: Readonly<RewardsStepProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [adding, setAdding] = useState<RewardGroupKey | null>(null);
  const [kindFilter, setKindFilter] = useState<RewardKindFilter>("all");

  const form = useForm<RewardsFormInput, unknown, RewardsFormValues>({
    resolver: zodResolver(rewardsFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rewards" });
  const rewardsError = form.formState.errors.rewards;
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  const watchedRewards = form.watch("rewards");
  const kindCounts = {
    all: watchedRewards.length,
    point: watchedRewards.filter((r) => r.rewardType === "point").length,
    coupon: watchedRewards.filter((r) => r.rewardType === "coupon").length,
    assigned: watchedRewards.filter((r) => r.rewardType === "assigned").length,
  };
  // The kind filter only earns its place once coupons or gifts exist, and only on the
  // Program page — the wizard never creates those.
  const showKindFilter = mode === "section" && kindCounts.coupon + kindCounts.assigned > 0;

  const tiers = orderTiers(upperTiers);
  const groups = groupRewardIndices(watchedRewards, tiers);
  const visible = (index: number) =>
    kindFilter === "all" || (watchedRewards[index]?.rewardType ?? "point") === kindFilter;

  /**
   * A saved reward is not simply dropped: customers may be holding it. The API retires a
   * reward in use rather than deleting it, so the confirm says that plainly.
   */
  const removeReward = async (index: number) => {
    const row = watchedRewards[index];
    if (row?.id) {
      const ok = await confirm({
        title: t("Remove {name}?", { name: row.name || t("this reward") }),
        description: t(
          "If customers are holding it or have redeemed it before, it is retired instead: nobody new can get it, and anyone holding one can still use theirs. Past redemptions stay in Activity.",
        ),
        confirmText: t("Remove"),
      });
      if (!ok) return;
    }
    remove(index);
  };

  const addReward = (pick: RewardExamplePick) => {
    const index = fields.length;
    const availableForTiers = tiersForGroup(adding ?? BASE_GROUP, tiers);
    const row: RewardFormRow = pick.built
      ? {
          name: pick.built.label,
          description: pick.built.example.description,
          pointsCost: pick.built.pointsCost ?? FALLBACK_POINTS_COST,
          rewardType: "point",
          rewardValue: toRewardValueRecord(pick.built.rewardValue),
          availableForTiers,
        }
      : {
          name: "",
          description: "",
          pointsCost: FALLBACK_POINTS_COST,
          rewardType: "point",
          rewardValue: toRewardValueRecord(blankRewardValue(pick.kind)),
          availableForTiers,
        };

    append(row);
    // Land in the name box: a blank tile arrives nameless, which is invalid until they type.
    window.setTimeout(() => form.setFocus(`rewards.${index}.name`), 0);
  };

  const existingNames = watchedRewards.map((reward) => (reward?.name ?? "").trim().toLowerCase());

  /**
   * Every point reward re-priced to the ~3% target at the current earn rate — for rewards
   * saved before the rate changed. Nothing persists until the merchant saves.
   */
  const repriceable = watchedRewards.filter(
    (reward) =>
      reward.rewardType === "point" &&
      suggestPointsCost({
        rewardValue: reward.rewardValue,
        earnRate: giveback.earnRate,
        averageOrderValue: giveback.averageOrderValue,
      }) !== null,
  ).length;

  const repriceAll = () => {
    let changed = 0;
    watchedRewards.forEach((reward, index) => {
      if (reward.rewardType !== "point") return;
      const cost = suggestPointsCost({
        rewardValue: reward.rewardValue,
        earnRate: giveback.earnRate,
        averageOrderValue: giveback.averageOrderValue,
      });
      if (cost === null || cost === toFiniteNumber(reward.pointsCost)) return;
      form.setValue(`rewards.${index}.pointsCost`, cost, { shouldDirty: true });
      changed += 1;
    });
    toast.success(
      changed > 0
        ? t("{count} rewards re-priced to about 3% back — save to keep them.", { count: changed })
        : t("Every reward is already priced for your earn rate."),
    );
  };

  // The one place the giveback is shown during setup: points only have a value once there
  // is a reward to spend them on.
  const panel = (
    <RewardsGivebackPanel
      control={form.control}
      context={giveback}
      onEditAverageOrderValue={onEditAverageOrderValue}
      title={mode === "section" ? t("What this costs you") : t("Your program gives back")}
      hint={
        mode === "section"
          ? t("Updates as you edit")
          : t("Priced from your earn rate and typical order value.")
      }
    />
  );

  const renderRow = (index: number) => {
    const item = fields[index];
    if (!item || !visible(index)) return null;
    const kind = watchedRewards[index]?.rewardType ?? "point";
    if (kind !== "point") {
      return (
        <ReadOnlyRewardRow
          key={item.id}
          row={watchedRewards[index]}
          pointsName={pointsName}
          advancedEditorHref={advancedEditorHref}
          onRemove={() => void removeReward(index)}
        />
      );
    }
    return (
      <RewardRow
        key={item.id}
        index={index}
        form={form}
        giveback={giveback}
        pointsName={pointsName}
        tierOptions={tierOptions}
        showTierPicker={mode === "section"}
        onRemove={() => void removeReward(index)}
      />
    );
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        icon={<IconGift />}
        tone="blue"
        title={t("Rewards")}
        description={t("What customers can spend their {points} on.", { points: pointsName })}
      />

      <StepLayout
        mode={mode}
        aside={
          <>
            {panel}
            {railExtra}
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <BonusesCard control={form.control} />

          {showKindFilter && (
            <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(asKindFilter(String(v)))}>
              <TabsList>
                <TabsTrigger value="all">
                  {t("All")} · {kindCounts.all}
                </TabsTrigger>
                <TabsTrigger value="point">
                  {t("Point rewards")} · {kindCounts.point}
                </TabsTrigger>
                <TabsTrigger value="coupon">
                  {t("Coupons")} · {kindCounts.coupon}
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  {t("Free gifts")} · {kindCounts.assigned}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <RewardGroup
            title={t("Rewards for everyone")}
            description={t("Any member can save up for these.")}
            icon={<IconGift />}
            tone="blue"
            indices={groups[BASE_GROUP]}
            emptyTitle={t("No rewards yet")}
            emptyText={t("Customers can still earn points, but they will have nothing to redeem.")}
            addLabel={t("Add reward")}
            onAdd={() => setAdding(BASE_GROUP)}
          >
            {renderRow}
          </RewardGroup>

          {tiers.map((tier, index) => {
            const top = index === tiers.length - 1;
            return (
              <RewardGroup
                key={tier.id}
                title={
                  top
                    ? t("{name}-only perks", { name: tier.name })
                    : t("{name} and above", { name: tier.name })
                }
                description={
                  top
                    ? t("Only members who have reached {name} can redeem these.", {
                        name: tier.name,
                      })
                    : t("For members from {name} up — {next} gets these too.", {
                        name: tier.name,
                        next: tiers[index + 1].name,
                      })
                }
                icon={<IconCrown />}
                tone="amber"
                indices={groups[tier.id] ?? []}
                emptyTitle={t("Nothing for {name} yet", { name: tier.name })}
                emptyText={t(
                  "A reward only they can reach is what makes the tier worth chasing — a free upgrade, a bigger discount, an early look.",
                )}
                addLabel={t("Add {name} reward", { name: tier.name })}
                onAdd={() => setAdding(tier.id)}
              >
                {renderRow}
              </RewardGroup>
            );
          })}

          {typeof rewardsError?.root?.message === "string" && (
            <p className="text-xs text-destructive">{rewardsError.root.message}</p>
          )}

          {(repriceable > 0 || advancedEditorHref) && (
            <div className="flex flex-wrap items-center gap-3">
              {repriceable > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={repriceAll}
                  title={t(
                    "Sets each reward's cost so it gives back about 3% at your current earn rate.",
                  )}
                >
                  <IconCalculator size={16} />
                  {t("Re-price from my earn rate")}
                </Button>
              )}
              {advancedEditorHref && (
                <span className="text-xs text-muted-foreground">
                  {t("Coupon codes and free gifts:")} {advancedEditorHref}
                </span>
              )}
            </div>
          )}
        </div>
      </StepLayout>

      <RewardExamplePicker
        open={adding !== null}
        onOpenChange={(open) => {
          if (!open) setAdding(null);
        }}
        presetKey={giveback.presetKey}
        earnRate={giveback.earnRate}
        averageOrderValue={giveback.averageOrderValue}
        currencyCode={giveback.currencyCode}
        currencySymbol={giveback.currencySymbol}
        pointsName={giveback.pointsName}
        existingNames={existingNames}
        onPick={addReward}
        onEditAverageOrderValue={onEditAverageOrderValue}
      />

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}

/** Narrows the Tabs value back to the filter union; anything else means "all". */
function asKindFilter(value: string): RewardKindFilter {
  return value === "point" || value === "coupon" || value === "assigned" ? value : "all";
}
