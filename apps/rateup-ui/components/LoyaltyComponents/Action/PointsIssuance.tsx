"use client";

import { Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import { useLCAction } from "@/backend/loyalty/customer/customer.query";
import { ContainedNumberInput } from "@/components/input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import { LASelector } from "../utils";

const LoyaltyManualCustomerActionModal = ({ opened, close }) => {
  const lcActionMut = useLCAction();
  const translations = useTranslations();

  const form = useForm({
    initialValues: {
      phone: "",
      actionId: "",
      amount: 0,
    },
  });

  const handleCall = () => {
    lcActionMut.mutate(form.values, {
      onSettled: () => {
        form.reset();
        close();
      },
    });
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Points Issuance")}
      centered
      includeCancelButton
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      buttonTitle="Issue"
      onSubmit={handleCall}
      isLoading={lcActionMut.isPending}
    >
      <Stack>
        <PhoneInputWithCountry
          label={translations("Phone Number")}
          {...form.getInputProps("phone")}
        />
        <LASelector
          label={translations("Action")}
          {...form.getInputProps("actionId")}
          placeholder="Select"
        />
        <ContainedNumberInput
          label={translations("Amount")}
          {...form.getInputProps("amount")}
          placeholder={translations("Enter amount")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default LoyaltyManualCustomerActionModal;
