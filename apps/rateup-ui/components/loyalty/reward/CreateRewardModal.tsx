import { useEffect } from "react";

import { Stack } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";

import {
  ContainedNumberInput,
  ContainedTextArea,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateLoyaltyRewardMutation,
  useUpdateLoyaltyRewardMutation,
} from "../../../backend/loyalty/reward/reward.query";

export function CreateRewardModal({
  opened,
  close,
  reward,
}: {
  opened: boolean;
  close: () => void;
  reward?: any;
}) {
  const { translations } = useTranslations();

  const createReward = useCreateLoyaltyRewardMutation();
  const updateReward = useUpdateLoyaltyRewardMutation(reward?.id);

  const form = useForm({
    initialValues: {
      name: "",
      points: 0,
      description: "",
      maxPerUser: 1,
      tnc: "",
    },
    validate: {
      name: isNotEmpty("Name cannot be empty"),
      points: (value) => (!value ? "Points required" : null),
      maxPerUser: (value) => (!value ? "Max Per User required" : null),
      description: isNotEmpty("description cannot be empty"),
    },
  });

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    if (reward) {
      updateReward.mutate(form.values, {
        onSuccess: () => {
          form.reset();
          close();
        },
      });
      return;
    }
    createReward.mutate(form.values, {
      onSuccess: () => {
        form.reset();
        close();
      },
    });
  }

  useEffect(() => {
    if (reward) {
      form.setInitialValues({ ...reward });
      form.setValues({ ...reward });
    }
  }, [reward]);

  return (
    <FormModalLayout
      opened={opened}
      onClose={() => {
        form.reset();
        close();
      }}
      title={
        reward ? translations["Update Reward"] : translations["Create Reward"]
      }
      centered
      buttonTitle={reward ? "Update" : "Create"}
      onSubmit={form.onSubmit(handleSubmit)}
      cancelOnClick={() => {
        form.reset();
        close();
      }}
      size="lg"
      isLoading={createReward.isPending}
      includeCancelButton
    >
      <LoyaltyRewardForm form={form} />
    </FormModalLayout>
  );
}

export const LoyaltyRewardForm = ({ form }) => {
  const { translations } = useTranslations();
  return (
    <Stack>
      <ContainedTextField
        label={"Name"}
        {...form.getInputProps("name")}
        placeholder={translations["Enter Reward Name"]}
      />
      <ContainedNumberInput
        label={"Points"}
        {...form.getInputProps("points")}
        allowDecimal={false}
        allowNegative={false}
      />
      <ContainedNumberInput
        label={"Max Per User"}
        {...form.getInputProps("maxPerUser")}
        allowDecimal={false}
        allowNegative={false}
      />
      <ContainedTextArea
        label={"Description"}
        {...form.getInputProps("description")}
        autosize
        minRows={5}
      />
      <ContainedTextArea
        label={"Terms and Condition"}
        {...form.getInputProps("tnc")}
        autosize
        minRows={5}
      />
    </Stack>
  );
};
