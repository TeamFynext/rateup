import { zodResolver } from "@hookform/resolvers/zod";
import { IconMessageStar, IconTrash } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import type { LoyaltyReward, LoyaltyRewardInput } from "@/backend/loyalty/reward.api";
import {
  useCreateLoyaltyRewardMutation,
  useLoyaltyRewardById,
  useLoyaltyRewards,
  useToggleLoyaltyRewardStatusMutation,
  useUpdateLoyaltyRewardMutation,
} from "@/backend/loyalty/reward.query";
import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import { useLoyaltyTiers } from "@/backend/loyalty/tier.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { RewardExamplePicker, type RewardExamplePick } from "../giveback/RewardExamplePicker.tsx";
import { useRewardEconomicsContext } from "../giveback/useRewardEconomicsContext.ts";
import { asPresetKey } from "../onboarding/rewardExamples.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { CouponFields } from "./form/CouponFields.tsx";
import { GiftFields } from "./form/GiftFields.tsx";
import { PointRewardFields } from "./form/PointRewardFields.tsx";
import { giftFromExample, pointRewardFromExample } from "./fromExample.ts";
import { rewardKindMeta } from "./rewardKinds.ts";
import {
  BLANK_COUPON,
  BLANK_GIFT,
  BLANK_POINT_REWARD,
  couponFormValues,
  couponPayload,
  giftFormValues,
  giftPayload,
  pointRewardFormValues,
  pointRewardPayload,
  type EditableRewardType,
} from "./rewardPayload.ts";
import { RewardTypeTag } from "./RewardTypeTag.tsx";
import {
  couponSchema,
  giftSchema,
  pointRewardSchema,
  type CouponFormValues,
  type CouponValues,
  type GiftFormValues,
  type GiftValues,
  type PointRewardFormValues,
  type PointRewardValues,
} from "./schemas.ts";
import { useDeleteReward } from "./useDeleteReward.ts";

/** `/rewards/new?type=…` — a blank form, opened on the example picker where one applies. */
export function NewRewardPage({ type }: Readonly<{ type: EditableRewardType }>) {
  const { data: tiers, isLoading } = useLoyaltyTiers();
  if (isLoading) return <Loader />;
  return <RewardEditor type={type} tiers={tiers ?? []} />;
}

/** `/rewards/:rewardId` — the saved reward in the same form. */
export function EditRewardPage({ rewardId }: Readonly<{ rewardId: string }>) {
  const { t } = useTranslation();
  const { data: reward, isLoading, isError } = useLoyaltyRewardById(rewardId);
  const { data: tiers, isLoading: tiersLoading } = useLoyaltyTiers();

  if (isLoading || tiersLoading) return <Loader />;

  if (isError || !reward) {
    return (
      <EditorFrame>
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("This reward no longer exists")}</EmptyTitle>
            <EmptyDescription>{t("It may have been deleted.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </EditorFrame>
    );
  }

  if (reward.rewardType === "review") {
    return (
      <EditorFrame>
        <Empty className="rounded-lg border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconMessageStar />
            </EmptyMedia>
            <EmptyTitle>{reward.name}</EmptyTitle>
            <EmptyDescription>
              {t("Review rewards are set up with the feedback survey that grants them.")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link to={LOYALTY_PATHS.feedback} search={{ tab: "settings", page: 1 }} />}
            >
              {t("Open Feedback")}
            </Button>
          </EmptyContent>
        </Empty>
      </EditorFrame>
    );
  }

  return (
    <RewardEditor
      // A refetch after saving must not reset a form the merchant has moved on from.
      key={reward.id}
      type={reward.rewardType}
      reward={reward}
      tiers={tiers ?? []}
    />
  );
}

function EditorFrame({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <BackLink to={LOYALTY_PATHS.rewards} label={t("Rewards")} />
      {children}
    </div>
  );
}

interface EditorProps {
  type: EditableRewardType;
  reward?: LoyaltyReward;
  tiers: readonly LoyaltyTier[];
}

function RewardEditor(props: Readonly<EditorProps>) {
  if (props.type === "coupon") return <CouponEditor {...props} />;
  if (props.type === "assigned") return <GiftEditor {...props} />;
  return <PointRewardEditor {...props} />;
}

function PointRewardEditor({ reward, tiers }: Readonly<EditorProps>) {
  const economics = useRewardEconomicsContext();
  const form = useForm<PointRewardFormValues, unknown, PointRewardValues>({
    resolver: zodResolver(pointRewardSchema),
    defaultValues: reward ? pointRewardFormValues(reward) : BLANK_POINT_REWARD,
  });
  return (
    <EditorShell
      type="point"
      reward={reward}
      form={form}
      toPayload={pointRewardPayload}
      onExample={(pick) => form.reset(pointRewardFromExample(pick, BLANK_POINT_REWARD))}
    >
      <PointRewardFields form={form} tiers={tiers} pointsName={economics.pointsName} />
    </EditorShell>
  );
}

function CouponEditor({ reward, tiers }: Readonly<EditorProps>) {
  const form = useForm<CouponFormValues, unknown, CouponValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: reward ? couponFormValues(reward) : BLANK_COUPON,
  });
  return (
    <EditorShell type="coupon" reward={reward} form={form} toPayload={couponPayload}>
      <CouponFields form={form} tiers={tiers} />
    </EditorShell>
  );
}

function GiftEditor({ reward, tiers }: Readonly<EditorProps>) {
  const form = useForm<GiftFormValues, unknown, GiftValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: reward ? giftFormValues(reward) : BLANK_GIFT,
  });
  return (
    <EditorShell
      type="assigned"
      reward={reward}
      form={form}
      toPayload={giftPayload}
      onExample={(pick) => form.reset(giftFromExample(pick, BLANK_GIFT))}
    >
      <GiftFields form={form} tiers={tiers} />
    </EditorShell>
  );
}

/**
 * Heading, save bar and, on an existing reward, its on/off switch and delete. `onExample`
 * marks a type the example picker can prefill; a new one of those opens on the picker.
 */
function EditorShell<T extends FieldValues, O>({
  type,
  reward,
  form,
  toPayload,
  onExample,
  children,
}: Readonly<{
  type: EditableRewardType;
  reward?: LoyaltyReward;
  form: UseFormReturn<T, unknown, O>;
  toPayload: (values: O) => LoyaltyRewardInput;
  onExample?: (pick: RewardExamplePick) => void;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const economics = useRewardEconomicsContext();
  const { data: program } = useLoyaltyProgram();
  const { data: rewards } = useLoyaltyRewards();
  const [picking, setPicking] = useState(!reward && !!onExample);

  const backToList = () => navigate({ to: LOYALTY_PATHS.rewards });
  const create = useCreateLoyaltyRewardMutation(backToList);
  const update = useUpdateLoyaltyRewardMutation(reward?.id ?? "", backToList);
  const remove = useDeleteReward(backToList);
  const toggle = useToggleLoyaltyRewardStatusMutation();

  const meta = rewardKindMeta(t, economics.pointsName)[type];
  const title = reward
    ? t("Edit {name}", { name: reward.name })
    : t("New {kind}", { kind: meta.label.toLowerCase() });

  const onSubmit = form.handleSubmit((values) => {
    const payload = toPayload(values);
    if (reward) update.mutate(payload);
    else create.mutate(payload);
  });

  return (
    <EditorFrame>
      <PageHeading title={title} description={<RewardTypeTag type={type} />} />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Card>
          <CardContent className="p-5">{children}</CardContent>
        </Card>

        {reward && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Switch
                checked={reward.status === "ACTIVE"}
                onCheckedChange={(checked) =>
                  toggle.mutate({ rewardId: reward.id, status: checked ? "ACTIVE" : "INACTIVE" })
                }
              />
              <span>
                <span className="block font-medium">{t("Offered to customers")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("Switch off to hide it without losing its history.")}
                </span>
              </span>
            </label>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              loading={remove.isPending}
              onClick={() => void remove.deleteReward(reward)}
            >
              <IconTrash data-icon="inline-start" />
              {t("Delete")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {onExample && !reward && (
            <Button type="button" variant="ghost" onClick={() => setPicking(true)}>
              {t("Start from an example")}
            </Button>
          )}
          <Button type="button" variant="outline" render={<Link to={LOYALTY_PATHS.rewards} />}>
            {t("Cancel")}
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {reward ? t("Save changes") : t("Create reward")}
          </Button>
        </div>
      </form>

      {onExample && (
        <RewardExamplePicker
          open={picking}
          onOpenChange={setPicking}
          presetKey={asPresetKey(program?.onboardingPresetKey)}
          earnRate={economics.earnRate}
          averageOrderValue={economics.averageOrderValue}
          currencyCode={economics.currencyCode}
          currencySymbol={economics.currencySymbol}
          pointsName={economics.pointsName}
          existingNames={(rewards ?? []).map((r) => r.name.trim().toLowerCase())}
          // A gift is handed out, not bought with points, so only the free-item examples fit.
          kinds={type === "assigned" ? ["free_item"] : undefined}
          pricedInPoints={type !== "assigned"}
          onPick={(pick) => {
            setPicking(false);
            onExample(pick);
          }}
          onEditAverageOrderValue={() => navigate({ to: LOYALTY_PATHS.settings })}
        />
      )}
    </EditorFrame>
  );
}
