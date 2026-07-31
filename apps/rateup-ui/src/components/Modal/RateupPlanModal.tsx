import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";
import {
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlanUpdateMutation,
} from "@/backend/payment/payment.query";
import { Badge } from "@/components/ui/badge.tsx";
// import { PaymentPlans } from "../../app/admin/rateup";
import { PaymentType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { widgetIds } from "@/utils/constants/forms.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import { toSelectOptions } from "@/utils/select-options.ts";
import { getSampleSubscriptionFeatures } from "@/utils/subscription/subscription.ts";

import { Button } from "../ui/button.tsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Spinner } from "../ui/spinner.tsx";
import { TagsInput } from "../ui/tags-input.tsx";
import { Textarea } from "../ui/textarea.tsx";

enum PaymentPlans {
  razorpay = "Razorpay Plans",
  stripe = "Stripe Products",
}
const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
];

/** The plan row this admin modal edits. */
interface RateupPlanFormValues extends RateupPaymentPlan {
  badge?: string;
  price?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  monthlyPaymentPlanId?: string;
  yearlyPaymentPlanId?: string;
}

const RateupPlanModal = ({
  opened,
  close,
  planList,
  plan = null,
}: {
  opened: boolean;
  close: () => void;
  planList: Array<{ group: string; items: unknown[] }> | undefined;
  plan?: RateupPlanFormValues | null;
}) => {
  const uid = useId();
  const [checked, setChecked] = useState(false);
  const { t: translations } = useTranslation();
  const isEdit = Boolean(plan?.id);
  const rateupPaymentsPlanMutation = useRateupPaymentsPlanMutation(close);
  const rateupPaymentsPlanUpdateMutation = useRateupPaymentsPlanUpdateMutation(close);
  const razorpayOptions = toSelectOptions(
    planList?.find((group) => group?.group === PaymentPlans.razorpay)?.items ?? [],
  );
  const widgetIdOptions = toSelectOptions(widgetIds);
  const planTypeOptions = toSelectOptions(Object.values(PaymentType));
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: translations("Name should Not Be empty") }),
    displayName: z
      .string()
      .trim()
      .min(1, { message: translations("Display Name should Not Be empty") }),
    // Carried in form state for the update call rather than edited directly.
    id: z.string().optional(),
    stripeId: z.string().optional(),
    displayWidgetId: z.string().optional(),
    planType: z
      .string()
      .trim()
      .min(1, { message: translations("Plan Type should Not Be empty") }),
    paymentPlanId: z.string().optional(),
    description: z
      .array(z.string())
      .min(1, { message: translations("Description should Not Be empty") }),
    features: z
      .string()
      .trim()
      .min(1, { message: translations("Features should Not Be empty") }),
    trialDays: z.number(),
    badge: z.string().trim().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    monthlyPrice: z.number().optional(),
    yearlyPrice: z.number().optional(),
    monthlyPaymentPlanId: z.string().optional(),
    yearlyPaymentPlanId: z.string().optional(),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: "",
      name: "",
      displayName: "",
      displayWidgetId: "",
      planType: PaymentType.BASE,
      paymentPlanId: "",
      stripeId: "",
      description: [],
      features: "",
      trialDays: 0,
      badge: "",
      price: 0,
      currency: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyPaymentPlanId: "",
      yearlyPaymentPlanId: "",
    },
  });
  const values = form.watch();

  useEffect(() => {
    if (opened && plan?.id) {
      form.reset({
        id: plan.id,
        name: plan.name ?? "",
        displayName: plan.displayName ?? "",
        displayWidgetId: plan.displayWidgetId ?? "",
        planType: plan.planType ?? PaymentType.BASE,
        paymentPlanId: plan.paymentPlanId ?? "",
        stripeId: plan.stripeId ?? "",
        description: plan.description ?? [],
        features: plan.features ? JSON.stringify(plan.features, null, 2) : "",
        trialDays: plan.trialDays ?? 0,
        badge: plan.badge ?? "",
        price: plan.price ?? 0,
        currency: plan.currency ?? "",
        monthlyPrice: plan.monthlyPrice ?? 0,
        yearlyPrice: plan.yearlyPrice ?? 0,
        monthlyPaymentPlanId: plan.monthlyPaymentPlanId ?? "",
        yearlyPaymentPlanId: plan.yearlyPaymentPlanId ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, plan?.id]);

  useEffect(() => {
    if (rateupPaymentsPlanMutation?.isSuccess || rateupPaymentsPlanUpdateMutation?.isSuccess)
      form?.reset();
  }, [rateupPaymentsPlanMutation?.isSuccess, rateupPaymentsPlanUpdateMutation?.isSuccess]);

  useEffect(() => {
    if (checked) {
      const sampleFeature = JSON.stringify(getSampleSubscriptionFeatures(10));
      form.setValue("features", sampleFeature, { shouldDirty: true });
    } else {
      form.setValue("features", "", { shouldDirty: true });
    }
  }, [checked]);

  const handleSubmit = (values: z.infer<typeof schema>) => {
    const payload = { ...values, currency: values.currency || undefined };
    if (isEdit) {
      rateupPaymentsPlanUpdateMutation.mutate({ ...payload, id: plan?.id });
      toast.loading(translations("Hold.. your data is getting updated..."), {
        id: "load-data",
      });
    } else {
      rateupPaymentsPlanMutation.mutate(payload);
      toast.loading(translations("Hold.. your data is getting created..."), {
        id: "load-data",
      });
    }
    setChecked(false);
  };

  const closeModal = () => {
    close();
    form?.reset();
  };
  const submitPlan = form.handleSubmit(handleSubmit);
  const isSaving =
    rateupPaymentsPlanMutation?.isPending || rateupPaymentsPlanUpdateMutation?.isPending;

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeModal();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-auto sm:max-w-175"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-semibold">
            {isEdit ? translations("Edit Rateup Plan") : translations("Add Rateup Plan")}
          </DialogTitle>
        </DialogHeader>
        <form
          className="p-5"
          onSubmit={submitPlan}
          onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => void submitPlan()]])}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor={`${uid}-field`}>
                {translations("Name")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                id={`${uid}-field`}
                placeholder={translations("Name")}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <FieldError>{form.formState.errors.name.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-2`}>
                {translations("Dispaly Name")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                id={`${uid}-field-2`}
                placeholder={translations("Display Name")}
                {...form.register("displayName")}
              />
              {form.formState.errors.displayName && (
                <FieldError>{form.formState.errors.displayName.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-3`}>
                {translations("Display Widget Id")}
              </FieldLabel>
              <Select
                items={widgetIdOptions}
                value={values.displayWidgetId ?? ""}
                onValueChange={(value) =>
                  form.setValue("displayWidgetId", value ?? undefined, { shouldDirty: true })
                }
              >
                <SelectTrigger id={`${uid}-field-3`} className="w-full">
                  <SelectValue placeholder={translations("Widget Id")} />
                </SelectTrigger>
                <SelectContent>
                  {widgetIdOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-4`}>
                {translations("Plan Type")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Select
                items={planTypeOptions}
                value={values.planType ?? ""}
                onValueChange={(value) =>
                  form.setValue("planType", value ?? "", { shouldDirty: true })
                }
              >
                <SelectTrigger id={`${uid}-field-4`} className="w-full">
                  <SelectValue placeholder={translations("Plan Type")} />
                </SelectTrigger>
                <SelectContent>
                  {planTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-5`}>
                {translations("Description")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <TagsInput
                id={`${uid}-field-5`}
                value={values.description ?? []}
                onValueChange={(value) =>
                  form.setValue("description", value ?? undefined, { shouldDirty: true })
                }
                placeholder={translations("Type Description and press enter")}
              />
              {form.formState.errors.description && (
                <FieldError>{form.formState.errors.description.message}</FieldError>
              )}
              <FieldDescription>Use || for split</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-trial-days`}>Trial Days</FieldLabel>
              <Input
                id={`${uid}-trial-days`}
                type="number"
                min={0}
                step={1}
                value={values.trialDays ?? 0}
                onChange={(event) =>
                  form.setValue("trialDays", Number(event.target.value), { shouldDirty: true })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-6`}>{translations("Currency")}</FieldLabel>
              <Select
                items={currencyOptions}
                value={values.currency ?? ""}
                onValueChange={(value) =>
                  form.setValue("currency", value ?? undefined, { shouldDirty: true })
                }
              >
                <SelectTrigger id={`${uid}-field-6`} className="w-full">
                  <SelectValue placeholder={translations("Currency")} />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-7`}>{translations("Badge")}</FieldLabel>
              <Input
                id={`${uid}-field-7`}
                placeholder={translations("e.g. Most Popular")}
                {...form.register("badge")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-8`}>
                {translations("Monthly Razorpay Plan")}
              </FieldLabel>
              <Select
                items={razorpayOptions}
                value={values.monthlyPaymentPlanId ?? ""}
                onValueChange={(value) =>
                  form.setValue("monthlyPaymentPlanId", value ?? undefined, { shouldDirty: true })
                }
                disabled={!razorpayOptions.length}
              >
                <SelectTrigger id={`${uid}-field-8`} className="w-full">
                  <SelectValue placeholder={translations("Gateway plan charged monthly")} />
                </SelectTrigger>
                <SelectContent>
                  {razorpayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-9`}>
                {translations("Annual Razorpay Plan")}
              </FieldLabel>
              <Select
                items={razorpayOptions}
                value={values.yearlyPaymentPlanId ?? ""}
                onValueChange={(value) =>
                  form.setValue("yearlyPaymentPlanId", value ?? undefined, { shouldDirty: true })
                }
                disabled={!razorpayOptions.length}
              >
                <SelectTrigger id={`${uid}-field-9`} className="w-full">
                  <SelectValue placeholder={translations("Gateway plan charged yearly")} />
                </SelectTrigger>
                <SelectContent>
                  {razorpayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-10`}>{translations("Monthly Price")}</FieldLabel>
              <Input
                id={`${uid}-field-10`}
                type="number"
                min={0}
                placeholder={translations("Shown on the card in Monthly")}
                value={values.monthlyPrice ?? 0}
                onChange={(event) =>
                  form.setValue("monthlyPrice", Number(event.target.value), { shouldDirty: true })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-field-11`}>
                {translations("Yearly Price (per month)")}
              </FieldLabel>
              <Input
                id={`${uid}-field-11`}
                type="number"
                min={0}
                placeholder={translations("Shown on the card in Annual")}
                value={values.yearlyPrice ?? 0}
                onChange={(event) =>
                  form.setValue("yearlyPrice", Number(event.target.value), { shouldDirty: true })
                }
              />
              <FieldDescription>{translations("Per-month price billed annually")}</FieldDescription>
            </Field>
          </div>
          <div className="flex flex-col gap-[3px] py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0">
                <span className="text-xs">
                  {translations("Features - (give data in json format)")}
                </span>
                <span className="text-xs text-red-500">*</span>
              </div>
              <Badge
                variant={checked ? "default" : "outline"}
                className="cursor-pointer"
                render={<button type="button" onClick={() => setChecked(!checked)} />}
              >
                {translations("Sample Feature")}
              </Badge>
            </div>
            <Textarea
              placeholder={translations("Features")}
              rows={8}
              className="font-mono text-xs"
              {...form.register("features")}
            />
            {form.formState.errors.features && (
              <FieldError>{form.formState.errors.features.message}</FieldError>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button type="reset" variant="ghost" onClick={closeModal}>
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Spinner />}
              {isEdit ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RateupPlanModal;
