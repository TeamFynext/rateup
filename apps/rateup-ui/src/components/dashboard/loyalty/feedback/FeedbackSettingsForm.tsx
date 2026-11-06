import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { FeedbackState } from "@/backend/loyalty/feedback.api.ts";
import { useUpdateFeedbackSettingsMutation } from "@/backend/loyalty/feedback.query.ts";
import type { LoyaltyReward } from "@/backend/loyalty/reward.api.ts";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query.ts";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { CreateReviewRewardDialog } from "./CreateReviewRewardDialog.tsx";
import {
  feedbackSettingsSchema,
  happyThresholdOptions,
  sendDelayOptions,
  type FeedbackSettingsFormValues,
  type FeedbackSettingsValues,
} from "./schemas.ts";
import { TeamGoogleLinkRow } from "./TeamGoogleLinkRow.tsx";

// Base UI treats "" as no selection, so "no reward" needs a value of its own.
const NO_REWARD = "none";

function defaultsOf(state: FeedbackState): FeedbackSettingsFormValues {
  const setting = state.setting;
  return {
    sendDelayMinutes: setting?.sendDelayMinutes ?? 120,
    cooldownDays: setting?.cooldownDays ?? 30,
    teamId: setting?.teamId ?? "",
    rewardId: setting?.rewardId ?? null,
    happyMinRating: setting?.happyMinRating ?? 4,
  };
}

export function FeedbackSettingsForm({ state }: Readonly<{ state: FeedbackState }>) {
  const { t } = useTranslation();
  const update = useUpdateFeedbackSettingsMutation();
  const { data: rewards } = useLoyaltyRewards();
  const [creatingReward, setCreatingReward] = useState(false);

  const form = useForm<FeedbackSettingsFormValues, unknown, FeedbackSettingsValues>({
    resolver: zodResolver(feedbackSettingsSchema),
    defaultValues: defaultsOf(state),
  });
  const { control, handleSubmit, reset, setValue, watch, formState } = form;

  // Keep the form on the saved values until the user starts editing.
  useEffect(() => {
    if (!formState.isDirty) reset(defaultsOf(state));
  }, [state, formState.isDirty, reset]);

  const teamId = watch("teamId");
  const reviewRewards = (rewards ?? []).filter(
    (reward): reward is LoyaltyReward => reward.rewardType === "review",
  );
  const rewardItems = [
    { value: NO_REWARD, label: t("No reward") },
    ...reviewRewards.map((reward) => ({ value: reward.id, label: reward.name })),
  ];

  const onSubmit = (values: FeedbackSettingsValues) =>
    update.mutate(values, { onSuccess: () => reset(values) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("When to ask")}</CardTitle>
          <CardDescription>
            {t("The survey goes out after points are earned — not on every visit.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            name="sendDelayMinutes"
            control={control}
            render={({ field, fieldState }) => {
              const items = sendDelayOptions(t, Number(field.value));
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Send")}</FieldLabel>
                  <Select
                    value={String(field.value)}
                    items={items}
                    onValueChange={(value) => field.onChange(Number(value ?? 0))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{t("after the customer earns points")}</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
          <Controller
            name="cooldownDays"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cooldownDays">
                  {t("Ask each customer at most every")}
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="cooldownDays"
                    type="number"
                    min={0}
                    max={365}
                    className="w-28"
                    value={String(field.value)}
                    onChange={(event) => field.onChange(event.target.value)}
                    aria-invalid={fieldState.invalid}
                  />
                  <span className="text-sm text-muted-foreground">{t("days")}</span>
                </div>
                <FieldDescription>
                  {t("A regular is not asked again inside this window. 0 asks after every visit.")}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="happyMinRating"
            control={control}
            render={({ field, fieldState }) => {
              const items = happyThresholdOptions(t);
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t("Count as happy")}</FieldLabel>
                  <Select
                    value={String(field.value)}
                    items={items}
                    onValueChange={(value) => field.onChange(Number(value ?? 4))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {t("Only customers at or above this overall rating get the review link.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Google review")}</CardTitle>
          <CardDescription>
            {t("Where happy customers are sent, and what they get for going.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            name="teamId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("Team")}</FieldLabel>
                <TeamSelector
                  value={field.value}
                  onChange={field.onChange}
                  enableDefaultValue={false}
                  className="w-full"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <TeamGoogleLinkRow teamId={teamId || undefined} />
          <Controller
            name="rewardId"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("Review reward")}</FieldLabel>
                <div className="flex gap-2">
                  <Select
                    value={field.value ?? NO_REWARD}
                    items={rewardItems}
                    onValueChange={(value) =>
                      field.onChange(!value || value === NO_REWARD ? null : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rewardItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreatingReward(true)}
                    aria-label={t("Create a review reward")}
                  >
                    <IconPlus size={16} />
                    {t("New")}
                  </Button>
                </div>
                <FieldDescription>
                  {t(
                    "Granted once per customer, the first time they tap the review link. Redeemed at the counter by code like any other reward.",
                  )}
                </FieldDescription>
              </Field>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end lg:col-span-2">
        <Button type="submit" disabled={!formState.isDirty || update.isPending}>
          <IconDeviceFloppy size={16} />
          {t("Save settings")}
        </Button>
      </div>

      <CreateReviewRewardDialog
        open={creatingReward}
        onOpenChange={setCreatingReward}
        onCreated={(reward) => {
          // Attach it straight away — the reward only means something once it is linked.
          setValue("rewardId", reward.id, { shouldDirty: true });
          update.mutate({ rewardId: reward.id });
        }}
      />
    </form>
  );
}
