import { Chip, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  useRateupPaymentsPlanMutation,
  useRateupPaymentsPlanUpdateMutation,
} from "@/backend/payment/payment.query";
// import { PaymentPlans } from "../../app/admin/rateup";
import { PaymentType } from "@/types/enums.ts";
import { widgetIds } from "@/utils/constants/forms.ts";
import { getSampleSubscriptionFeatures } from "@/utils/subscription/subscription.ts";

import {
  ContainedJsonInput,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTagInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "./FormModalLayout.tsx";

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
  const razorpayItems =
    planList?.find((group) => group?.group === PaymentPlans.razorpay)?.items ?? [];
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

  const form = useForm({
    initialValues: {
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
    validate: schemaResolver(schema, {
      sync: true,
    }),
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

  return (
    <FormModalLayout
      opened={opened}
      title={isEdit ? translations("Edit Rateup Plan") : translations("Add Rateup Plan")}
      onClose={() => {
        close();
        form?.reset();
      }}
      centered
      size="lg"
      buttonTitle={isEdit ? "Update" : "Save"}
      includeCancelButton
      onSubmit={form.onSubmit(handleSubmit)}
      isLoading={
        rateupPaymentsPlanMutation?.isPending || rateupPaymentsPlanUpdateMutation?.isPending
      }
    >
      <SimpleGrid cols={2}>
        <ContainedTextField
          label={translations("Name")}
          placeholder={translations("Name")}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label={translations("Dispaly Name")}
          placeholder={translations("Display Name")}
          withAsterisk
          {...form.getInputProps("displayName")}
        />
        <ContainedSelection
          label={translations("Display Widget Id")}
          placeholder={translations("Widget Id")}
          data={widgetIds}
          allowDeselect
          {...form.getInputProps("displayWidgetId")}
        />
        <ContainedSelection
          label={translations("Plan Type")}
          placeholder={translations("Plan Type")}
          data={Object.values(PaymentType)}
          defaultValue="BASE"
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps("planType")}
        />
        <ContainedTagInput
          label={translations("Description")}
          description={"Use || for split"}
          placeholder={translations("Type Description and press enter")}
          withAsterisk
          {...form.getInputProps("description")}
          splitChars={["||"]}
        />
        <ContainedNumberInput
          label={"Trial Days"}
          {...form.getInputProps("trialDays")}
          allowNegative={false}
          allowDecimal={false}
        />
        <ContainedSelection
          label={translations("Currency")}
          placeholder={translations("Currency")}
          data={currencyOptions}
          allowDeselect
          {...form.getInputProps("currency")}
        />
        <ContainedTextField
          label={translations("Badge")}
          placeholder={translations("e.g. Most Popular")}
          {...form.getInputProps("badge")}
        />
        <ContainedSelection
          label={translations("Monthly Razorpay Plan")}
          placeholder={translations("Gateway plan charged monthly")}
          data={razorpayItems}
          allowDeselect
          disabled={!razorpayItems?.length}
          {...form.getInputProps("monthlyPaymentPlanId")}
        />
        <ContainedSelection
          label={translations("Annual Razorpay Plan")}
          placeholder={translations("Gateway plan charged yearly")}
          data={razorpayItems}
          allowDeselect
          disabled={!razorpayItems?.length}
          {...form.getInputProps("yearlyPaymentPlanId")}
        />
        <ContainedNumberInput
          label={translations("Monthly Price")}
          placeholder={translations("Shown on the card in Monthly")}
          {...form.getInputProps("monthlyPrice")}
          allowNegative={false}
          allowDecimal={true}
        />
        <ContainedNumberInput
          label={translations("Yearly Price (per month)")}
          description={translations("Per-month price billed annually")}
          placeholder={translations("Shown on the card in Annual")}
          {...form.getInputProps("yearlyPrice")}
          allowNegative={false}
          allowDecimal={true}
        />
      </SimpleGrid>
      <Stack gap={3} py="xs">
        <Group justify="space-between">
          <Group gap={0}>
            <Text fz={"xs"}>{translations("Features - (give data in json format)")}</Text>
            <Text fz={"xs"} c="red">
              *
            </Text>
          </Group>
          <Chip size="xs" checked={checked} onChange={setChecked} variant="light">
            {translations("Sample Feature")}
          </Chip>
        </Group>
        <ContainedJsonInput
          placeholder={translations("Features")}
          withAsterisk
          {...form.getInputProps("features")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default RateupPlanModal;
