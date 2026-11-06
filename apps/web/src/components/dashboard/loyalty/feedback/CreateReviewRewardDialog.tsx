import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api.ts";
import { useCreateLoyaltyRewardMutation } from "@/backend/loyalty/reward.query.ts";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TemplateType } from "@/types/enums.ts";

import { reviewRewardSchema, type ReviewRewardFormValues } from "./schemas.ts";

const NO_TEMPLATE = "none";

/**
 * A review reward: no points cost, issued to the customer the first time they tap the
 * Google review link, redeemed by code. The WhatsApp template is what tells them.
 */
export function CreateReviewRewardDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (reward: LoyaltyReward) => void;
}>) {
  const { t } = useTranslation();
  const create = useCreateLoyaltyRewardMutation();
  const { data: templates } = useWaTemplates(TemplateType.LOYALTY);
  const templateItems = [
    { value: NO_TEMPLATE, label: t("Default reward message") },
    ...(templates ?? []).map((entry) => ({ value: entry.id, label: entry.data.name })),
  ];

  const { control, handleSubmit, reset } = useForm<ReviewRewardFormValues>({
    resolver: zodResolver(reviewRewardSchema),
    defaultValues: { name: "", description: "", waTemplateId: undefined },
  });

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = (values: ReviewRewardFormValues) =>
    create.mutate(
      {
        name: values.name,
        description: values.description ?? null,
        rewardType: "review",
        pointsCost: 0,
        rewardValue: { description: values.description ?? "", rewardType: "review" },
        waTemplateId: values.waTemplateId || null,
        availableForTiers: [],
        redemptionRules: {},
      },
      {
        onSuccess: (reward) => {
          onCreated(reward);
          close();
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("New review reward")}</DialogTitle>
          <DialogDescription>
            {t(
              "What a customer gets for leaving a Google review. It costs no points and each customer can earn it once.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="review-reward-name">{t("Name")}</FieldLabel>
                <Input
                  {...field}
                  id="review-reward-name"
                  placeholder={t("Free coffee on your next visit")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="review-reward-description">{t("Details")}</FieldLabel>
                <Textarea
                  {...field}
                  id="review-reward-description"
                  rows={2}
                  placeholder={t("Any size, hot or iced. Show the code at the counter.")}
                />
              </Field>
            )}
          />
          <Controller
            name="waTemplateId"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("WhatsApp message")}</FieldLabel>
                <Select
                  value={field.value ?? NO_TEMPLATE}
                  items={templateItems}
                  onValueChange={(value) =>
                    field.onChange(!value || value === NO_TEMPLATE ? undefined : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("The template the customer receives with their code, if not the default.")}
                </FieldDescription>
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t("Cancel")}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t("Create reward")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
