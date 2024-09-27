import { useEffect } from "react";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateRewardMutation,
  useUpdateRewardMutation,
} from "../../../backend/loyalty/reward/reward.query";
import { CampaignRewardType } from "../../../types/enums";

export function CreateRewardModal({ opened, close }) {
  const { translations } = useTranslations();
  return (
    <Modal
      centered
      opened={opened}
      onClose={close}
      title={translations["Create Reward"]}
      size="md"
    >
      <CreateRewardForm close={close} />
    </Modal>
  );
}

interface CreateRewardFormProps {
  close: () => void;
  initialValues?: any;
}
export function CreateRewardForm({
  close,
  initialValues,
}: CreateRewardFormProps) {
  const createReward = useCreateRewardMutation();
  const updateReward = useUpdateRewardMutation();
  const { translations } = useTranslations();
  const form = useForm({
    initialValues: initialValues || {
      name: "",
      type: CampaignRewardType.Fixed,
      fixedAmount: 0,
      percentage: 0,
      maxPointsPerTransaction: 0,
    },
  });

  useEffect(() => {
    form.setValues(initialValues);
  }, [initialValues]);

  function handleSubmit() {
    if (initialValues) {
      updateReward.mutate(form.values);
    } else {
      createReward.mutate(form.values, {
        onSettled: () => {
          close();
        },
      });
    }
  }

  return (
    <Stack>
      <TextInput
        label={translations["Reward Name"]}
        placeholder={translations["Enter Reward Name"]}
        required
        {...form.getInputProps("name")}
      />
      <Select
        label={translations["Reward Type"]}
        placeholder={translations["Select Reward Type"]}
        required
        {...form.getInputProps("type")}
        data={Object.values(CampaignRewardType)}
      />
      {form.values.type === CampaignRewardType.Fixed ? (
        <NumberInput
          label={translations["Fixed Amount"]}
          placeholder={translations["Enter Fixed Amount"]}
          required
          {...form.getInputProps("fixedAmount")}
        />
      ) : null}
      {form.values.type === CampaignRewardType.Percentage ? (
        <>
          <NumberInput
            label={translations["Percentage"]}
            placeholder={translations["Enter Percentage"]}
            required
            {...form.getInputProps("percentage")}
          />
          <NumberInput
            label={translations["Max Points Per Transaction"]}
            placeholder={translations["Enter Max Points Per Transaction"]}
            required
            {...form.getInputProps("maxPointsPerTransaction")}
          />
        </>
      ) : null}

      <Group justify="right" mt="md">
        <Button onClick={close} variant="outline">
          {translations["Cancel"]}
        </Button>
        <Button onClick={handleSubmit}>
          {initialValues
            ? translations["Update"]
            : translations["Create Reward"]}
        </Button>
      </Group>
    </Stack>
  );
}
