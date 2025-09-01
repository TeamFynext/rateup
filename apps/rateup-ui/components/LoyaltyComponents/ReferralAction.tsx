"use client";

import { Checkbox, Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import { useReferralLoyaltyAction } from "@/backend/loyalty/actions/actions.query";

import {
  ContainedNumberInput,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "../input/PhoneInputWithCountry";
import { LASelector } from "../LoyaltyComponents/utils";
import FormModalLayout from "../Modal/FormModalLayout";

const ReferralAction = ({ opened, close }) => {
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      referralCode: "",
      refereePhone: "",
      refereeName: "",
      amount: 0,
      actionIds: [],
      issuePurchasePoints: false,
    },
    validate: {
      referralCode: isNotEmpty(translations("Referral Code required")),
      refereePhone: isNotEmpty(translations("Phone number required")),
      actionIds: (value, { issuePurchasePoints }) =>
        issuePurchasePoints && !value.length
          ? translations("Select action")
          : null,
    },
  });
  const referActionMut = useReferralLoyaltyAction();
  const handleRefer = () => {
    if (form.validate().hasErrors) return;
    const { referralCode, ...rest } = form.values;
    referActionMut.mutate(
      { referralCode, data: rest },
      {
        onSettled: () => {
          form.reset();
          close();
        },
      },
    );
  };
  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title=""
      onSubmit={handleRefer}
      buttonTitle={translations("Refer")}
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      centered
      isLoading={referActionMut.isPending}
    >
      <Stack>
        <PhoneInputWithCountry
          label={translations("Phone Number")}
          {...form.getInputProps("refereePhone")}
        />
        <ContainedTextField
          label={translations("Name")}
          {...form.getInputProps("refereeName")}
        />
        <ContainedTextField
          label={translations("Referral Code")}
          {...form.getInputProps("referralCode")}
        />
        <ContainedNumberInput
          label={translations("Amount")}
          {...form.getInputProps("amount")}
        />
        <Checkbox
          {...form.getInputProps("issuePurchasePoints")}
          label={translations("Issue Direct Purchase Points")}
        />
        <LASelector
          multiSelect={true}
          multiSelectProps={{
            label: translations("Select Actions"),
            display: form.values.issuePurchasePoints ? "block" : "none",
            ...form.getInputProps("actionIds"),
            mb: "sm",
          }}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ReferralAction;
