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
import { CampaignRewardType } from "../../../types/enums";
import {
  useCreateRewardMutation,
  useUpdateRewardMutation,
} from "../../../backend/loyalty/reward/reward.query";
import { useEffect } from "react";

export function CreateRewardModal({ opened, close }) {
  return (
    <Modal
      centered
      opened={opened}
      onClose={close}
      title="Create Reward"
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
        label="Reward Name"
        placeholder="Enter Reward Name"
        required
        {...form.getInputProps("name")}
      />
      <Select
        label="Reward Type"
        placeholder="Select Reward Type"
        required
        {...form.getInputProps("type")}
        data={Object.values(CampaignRewardType)}
      />
      {form.values.type === CampaignRewardType.Fixed ? (
        <NumberInput
          label="Fixed Amount"
          placeholder="Enter Fixed Amount"
          required
          {...form.getInputProps("fixedAmount")}
        />
      ) : null}
      {form.values.type === CampaignRewardType.Percentage ? (
        <>
          <NumberInput
            label="Percentage"
            placeholder="Enter Percentage"
            required
            {...form.getInputProps("percentage")}
          />
          <NumberInput
            label="Max Points Per Transaction"
            placeholder="Enter Max Points Per Transaction"
            required
            {...form.getInputProps("maxPointsPerTransaction")}
          />
        </>
      ) : null}

      <Group justify="right" mt="md">
        <Button onClick={close} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {initialValues ? `Update` : `Create Reward`}
        </Button>
      </Group>
    </Stack>
  );
}
