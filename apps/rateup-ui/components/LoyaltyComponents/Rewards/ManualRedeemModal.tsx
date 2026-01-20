"use client";

import React from "react";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";

import { useRedeemReward } from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import FormModalLayout from "@/components/Modal/FormModalLayout";

const ManualRedeemModal = ({ opened, close }) => {
  const translations = useTranslations();

  const form = useForm({
    initialValues: {
      rewardId: "",
      phone: "",
      customerId: "",
    },
    validate: {
      phone: (value) =>
        !isValidPhoneNumber(value)
          ? translations("Invalid phone number")
          : null,
      rewardId: isNotEmpty(translations("Choose a reward")),
    },
  });

  const { data: rewards } = useGetLoyaltyRewards();

  const redeemReward = useRedeemReward();

  const rewardData = rewards
    ? rewards?.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.points} Points)`,
      }))
    : [];

  function handleRedeem() {
    if (form.validate().hasErrors) return;
    redeemReward.mutate(form.values, {
      onSettled: onClose,
    });
  }

  function onClose() {
    form.reset();
    close();
  }

  return (
    <FormModalLayout
      opened={opened}
      onClose={onClose}
      title={translations("Manual Redeeem")}
      centered
      includeCancelButton
      cancelOnClick={onClose}
      buttonTitle="Redeem"
      onSubmit={handleRedeem}
      isLoading={redeemReward.isPending}
    >
      <Stack>
        <PhoneInputWithCountry
          {...form.getInputProps("phone")}
          label={translations("Phone Number")}
        />
        <ContainedSelection
          data={rewardData}
          label={translations("Rewards")}
          {...form.getInputProps("rewardId")}
          placeholder={translations("Select a reward")}
        />
      </Stack>
    </FormModalLayout>
  );
};

export default ManualRedeemModal;
