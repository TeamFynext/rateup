import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlanUpdateMutation,
} from "@/backend/payment/payment.query";
import { Badge } from "@/components/ui/badge.tsx";
import { useBridgedForm } from "@/hooks/useBridgedForm";
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

const RateupPlanModal = ({ opened, close, planList, plan = null }) => {
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

  const form = useBridgedForm({
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
    schema,
  });

  useEffect(() => {
    if (opened && plan?.id) {
      form.setValues({
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
      form?.setFieldValue("features", sampleFeature);
    } else {
      form?.setFieldValue("features", "");
    }
  }, [checked]);

  const handleSubmit = (values) => {
    const payload = { ...values, currency: values.currency || undefined };
    if (isEdit) {
      rateupPaymentsPlanUpdateMutation.mutate({ ...payload, id: plan.id });
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
  const submitPlan = form.onSubmit(handleSubmit);
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
          onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, submitPlan]])}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>
                {translations("Name")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input placeholder={translations("Name")} {...form.getFieldProps("name")} />
              {form.errors.name && <FieldError>{form.errors.name}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>
                {translations("Dispaly Name")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Input
                placeholder={translations("Display Name")}
                {...form.getFieldProps("displayName")}
              />
              {form.errors.displayName && <FieldError>{form.errors.displayName}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{translations("Display Widget Id")}</FieldLabel>
              <Select
                items={widgetIdOptions}
                value={form.values.displayWidgetId ?? ""}
                onValueChange={(value) => form.setFieldValue("displayWidgetId", value)}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>
                {translations("Plan Type")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <Select
                items={planTypeOptions}
                value={form.values.planType ?? ""}
                onValueChange={(value) => form.setFieldValue("planType", value)}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>
                {translations("Description")}
                <span className="text-destructive"> *</span>
              </FieldLabel>
              <TagsInput
                value={form.values.description ?? []}
                onValueChange={(value) => form.setFieldValue("description", value)}
                placeholder={translations("Type Description and press enter")}
              />
              {form.errors.description && <FieldError>{form.errors.description}</FieldError>}
              <FieldDescription>Use || for split</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Trial Days</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.values.trialDays ?? 0}
                onChange={(event) => form.setFieldValue("trialDays", Number(event.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel>{translations("Currency")}</FieldLabel>
              <Select
                items={currencyOptions}
                value={form.values.currency ?? ""}
                onValueChange={(value) => form.setFieldValue("currency", value)}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>{translations("Badge")}</FieldLabel>
              <Input
                placeholder={translations("e.g. Most Popular")}
                {...form.getFieldProps("badge")}
              />
            </Field>
            <Field>
              <FieldLabel>{translations("Monthly Razorpay Plan")}</FieldLabel>
              <Select
                items={razorpayOptions}
                value={form.values.monthlyPaymentPlanId ?? ""}
                onValueChange={(value) => form.setFieldValue("monthlyPaymentPlanId", value)}
                disabled={!razorpayOptions.length}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>{translations("Annual Razorpay Plan")}</FieldLabel>
              <Select
                items={razorpayOptions}
                value={form.values.yearlyPaymentPlanId ?? ""}
                onValueChange={(value) => form.setFieldValue("yearlyPaymentPlanId", value)}
                disabled={!razorpayOptions.length}
              >
                <SelectTrigger className="w-full">
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
              <FieldLabel>{translations("Monthly Price")}</FieldLabel>
              <Input
                type="number"
                min={0}
                placeholder={translations("Shown on the card in Monthly")}
                value={form.values.monthlyPrice ?? 0}
                onChange={(event) => form.setFieldValue("monthlyPrice", Number(event.target.value))}
              />
            </Field>
            <Field>
              <FieldLabel>{translations("Yearly Price (per month)")}</FieldLabel>
              <Input
                type="number"
                min={0}
                placeholder={translations("Shown on the card in Annual")}
                value={form.values.yearlyPrice ?? 0}
                onChange={(event) => form.setFieldValue("yearlyPrice", Number(event.target.value))}
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
              {...form.getFieldProps("features")}
            />
            {form.errors.features && <FieldError>{form.errors.features}</FieldError>}
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
