"use client";

import React, { useEffect, useState } from "react";

import { Chip, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

// import { PaymentPlans } from "../../app/admin/rateup";
import { PaymentType } from "@/types/enums.ts";
import { useRateupPaymentsPlanMutation } from "@/backend/payment/payment.query";

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
const RateupPlanModal = ({ opened, close, planList }) => {
  const [checked, setChecked] = useState(false);
  const { t: translations } = useTranslation();
  const rateupPaymentsPlanMutation = useRateupPaymentsPlanMutation(close);
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
    },
    validate: schemaResolver(schema, {
      sync: true,
    }),
  });

  useEffect(() => {
    if (form?.values?.paymentPlanId) {
      const name = planList
        ?.find((data) => data?.group === PaymentPlans.razorpay)
        ?.items?.find(
          (item) => item.value === form?.values?.paymentPlanId,
        )?.label;
      form?.setFieldValue("name", name);
    }
    if (form?.values?.stripeId) {
      const name = planList
        ?.find((data) => data?.group === PaymentPlans.stripe)
        ?.items?.find((item) => item.value === form?.values?.stripeId)?.label;
      form?.setFieldValue("name", name);
    }
  }, [form?.values?.paymentPlanId, form?.values?.stripeId]);

  useEffect(() => {
    if (rateupPaymentsPlanMutation?.isSuccess) form?.reset();
  }, [rateupPaymentsPlanMutation?.isSuccess]);

  useEffect(() => {
    if (checked) {
      const sampleFeature = JSON.stringify(getSampleSubscriptionFeatures(10));
      form?.setFieldValue("features", sampleFeature);
    } else {
      form?.setFieldValue("features", "");
    }
  }, [checked]);

  const handleSubmit = (values) => {
    rateupPaymentsPlanMutation.mutate(values);
    toast.loading(translations("Hold.. your data is getting created..."), {
      id: "load-data",
    });
    setChecked(false);
  };

  return (
    <FormModalLayout
      opened={opened}
      title={translations("Add Rateup Plan")}
      onClose={() => {
        close();
        form?.reset();
      }}
      centered
      size="lg"
      buttonTitle={"Save"}
      includeCancelButton
      onSubmit={form.onSubmit(handleSubmit)}
      isLoading={rateupPaymentsPlanMutation?.isPending}
    >
      <SimpleGrid cols={2}>
        <ContainedSelection
          label={translations("Razorpay/Stripe Payment Plan")}
          placeholder={translations("Payment Plan")}
          data={planList}
          allowDeselect
          onChange={(value) => {
            let fieldId = "";
            let otherFieldId = "";
            for (const plan of planList) {
              if (plan?.items?.find((pl) => pl.value === value)) {
                fieldId =
                  plan?.group === PaymentPlans.razorpay
                    ? "paymentPlanId"
                    : "stripeId";
                otherFieldId =
                  plan?.group === PaymentPlans.razorpay
                    ? "stripeId"
                    : "paymentPlanId";
                break;
              }
            }
            form.setFieldValue(fieldId, value);
            form.setFieldValue(otherFieldId, "");
          }}
          disabled={!planList?.length}
        />
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
      </SimpleGrid>
      <Stack gap={3} py="xs">
        <Group justify="space-between">
          <Group gap={0}>
            <Text fz={"xs"}>
              {translations("Features - (give data in json format)")}
            </Text>
            <Text fz={"xs"} c="red">
              *
            </Text>
          </Group>
          <Chip
            size="xs"
            checked={checked}
            onChange={setChecked}
            variant="light"
          >
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
