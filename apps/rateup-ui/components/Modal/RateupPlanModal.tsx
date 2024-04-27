import React, { useEffect } from "react";
import FormModalLayout from "./FormModalLayout";
import { useForm } from "@mantine/form";
import {
  ContainedJsonInput,
  ContainedSelection,
  ContainedTagInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import { SimpleGrid } from "@mantine/core";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { PaymentType } from "../../types/enums";
import { widgetIds } from "../../utils/constants/forms";
import { notifications } from "@mantine/notifications";

const RateupPlanModal = ({
  opened,
  close,
  razorPayPlanFiltered,
  rateupPaymentsPlanMutation,
}) => {
  const schema = z.object({
    name: z.string().trim().min(1, { message: "Name should Not Be empty" }),
    displayName: z
      .string()
      .trim()
      .min(1, { message: "Display Name should Not Be empty" }),
    displayWidgetId: z
      .string()
      .trim()
      .min(1, { message: "Display WidgetId should Not Be empty" }),
    planType: z
      .string()
      .trim()
      .min(1, { message: "Plan Type should Not Be empty" }),
    paymentPlanId: z.string().optional(),
    description: z
      .array(z.string())
      .min(1, { message: "Description should Not Be empty" }),
    features: z.any(),
  });

  const form = useForm({
    initialValues: {
      id: "",
      name: "",
      displayName: "",
      displayWidgetId: "",
      planType: PaymentType.BASE,
      paymentPlanId: "",
      description: [],
      features: null,
    },
    validate: zodResolver(schema),
  });

  useEffect(() => {
    if (form?.values?.paymentPlanId) {
      const name = razorPayPlanFiltered?.filter(
        (data) => data?.value === form?.values?.paymentPlanId,
      )?.[0]?.label;
      form?.setFieldValue("name", name);
    }
  }, [form?.values?.paymentPlanId]);

  useEffect(() => {
    if (rateupPaymentsPlanMutation?.isSuccess) form?.reset();
  }, [rateupPaymentsPlanMutation?.isSuccess]);

  const handleSubmit = (values) => {
    rateupPaymentsPlanMutation.mutate(values);
    notifications.show({
      id: "load-data",
      color: "teal",
      title: "Creating RateUp Plan",
      loading: true,
      message: "Hold.. your data is getting created...",
      autoClose: 2000,
    });
  };

  return (
    <FormModalLayout
      opened={opened}
      title={"Add Rateup Plan"}
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
          label="Razorpay Payment Plan"
          placeholder="Payment Plan"
          data={razorPayPlanFiltered}
          allowDeselect={false}
          {...form.getInputProps("paymentPlanId")}
          disabled={!razorPayPlanFiltered?.length}
        />
        <ContainedTextField
          label="Name"
          placeholder="Name"
          withAsterisk
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label="Dispaly Name"
          placeholder="Display Name"
          withAsterisk
          {...form.getInputProps("displayName")}
        />
        <ContainedSelection
          label="Display Widget Id"
          placeholder="Widget Id"
          data={widgetIds}
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps("displayWidgetId")}
        />
        <ContainedSelection
          label="Plan Type"
          placeholder="Plan Type"
          data={Object.values(PaymentType)}
          defaultValue="BASE"
          withAsterisk
          allowDeselect={false}
          {...form.getInputProps("planType")}
        />
        <ContainedJsonInput
          label="Features - (give data in json format)"
          placeholder="Features"
          withAsterisk
          {...form.getInputProps("features")}
        />
        <ContainedTagInput
          label="Description"
          placeholder="Type Description and press enter"
          withAsterisk
          {...form.getInputProps("description")}
        />
      </SimpleGrid>
    </FormModalLayout>
  );
};

export default RateupPlanModal;
