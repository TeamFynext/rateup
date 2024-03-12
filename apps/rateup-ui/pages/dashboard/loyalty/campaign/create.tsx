import {
  Stack,
  Group,
  Title,
  Button,
  TextInput,
  Select,
  NumberInput,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { LoyaltyCampaignType } from "../../../../types/enums";
import { getLoyaltyCampaignTypeLabel } from "../../../../utils/enums";
import { useState } from "react";
import { useRewards } from "../../../../backend/loyalty/reward/reward.query";
import { RewardCard } from "../../../../components/loyalty/reward/RewardCard";
import { RewardSelectionModal } from "../../../../components/loyalty/campaign/RewardSelectionModal";
import { useCreateCampaignMutation } from "../../../../backend/loyalty/campaign/loyaltyCampaign.query";
import { useRouter } from "next/router";

export default function () {
  const { data: rewards } = useRewards(true);
  const form = useForm({
    initialValues: {
      name: "",
      type: LoyaltyCampaignType.Transaction,
      maxPerReferrer: 1,
      maxPerUser: 1,
      referrerRewardId: "",
      userRewardId: "",
    },
    validate: {
      name: (value: string) =>
        value.trim().length > 0 ? null : "Name is required",
      type: (value: LoyaltyCampaignType) =>
        value !== null ? null : "Type is required",
      maxPerReferrer: (value: number) => {
        if (form.values.type === LoyaltyCampaignType.Transaction) return;
        return value > 0 ? null : "Max Per Referrer is required";
      },
      maxPerUser: (value: number) =>
        value > 0 ? null : "Max Per User is required",
      referrerRewardId: (value: string) => {
        if (form.values.type === LoyaltyCampaignType.Transaction) return;

        return value !== "" ? null : "Referrer Reward is required";
      },
      userRewardId: (value: string) =>
        value !== "" ? null : "User Reward is required",
    },
  });

  const [rewardSelectionOpened, setRewardSelectionOpened] = useState<
    "referrer" | "user" | null
  >(null);
  const router = useRouter();
  const setReward =
    rewardSelectionOpened === "referrer"
      ? (rewardId: string) => form.setFieldValue("referrerRewardId", rewardId)
      : (rewardId: string) => form.setFieldValue("userRewardId", rewardId);

  const referrerReward = rewards?.find(
    (r) => r.id === form.values.referrerRewardId,
  );
  const userRewardId = rewards?.find((r) => r.id === form.values.userRewardId);

  const createCampaign = useCreateCampaignMutation();
  const handleCreate = () => {
    createCampaign.mutate(form.values, {
      onSuccess: ({ id }) => {
        form.reset();
        router.push(`/dashboard/loyalty/campaign/${id}`);
      },
    });
  };
  // TODO: add tooltips for each input

  return (
    <Stack>
      <Group>
        <Title order={1}>Create new Loyalty Campaign</Title>
      </Group>

      <TextInput
        label="Campaign Name"
        placeholder="Enter Campaign Name"
        required
        {...form.getInputProps("name")}
      />
      <Select
        label="Campaign Type"
        placeholder="Select Campaign Type"
        required
        {...form.getInputProps("type")}
        data={Object.values(LoyaltyCampaignType).map((type) => ({
          value: type,
          label: getLoyaltyCampaignTypeLabel(type),
        }))}
      />

      {form.values.type !== LoyaltyCampaignType.Transaction ? (
        <NumberInput
          label="Max Per Referrer"
          placeholder="Enter Max Per Referrer"
          required
          {...form.getInputProps("maxPerReferrer")}
        />
      ) : null}
      <NumberInput
        label="Max Per User"
        placeholder="Enter Max Per User"
        required
        {...form.getInputProps("maxPerUser")}
      />

      {form.values.type !== LoyaltyCampaignType.Transaction ? (
        <Group>
          <Text>Referrer Reward:</Text>
          {referrerReward ? (
            <RewardCard reward={referrerReward} />
          ) : (
            <Button
              variant="outline"
              onClick={() => setRewardSelectionOpened("referrer")}
            >
              Select Reward
            </Button>
          )}
        </Group>
      ) : null}
      <Group>
        <Text>User Reward:</Text>
        {userRewardId ? (
          <RewardCard reward={userRewardId} />
        ) : (
          <Button
            variant="outline"
            onClick={() => setRewardSelectionOpened("user")}
          >
            Select Reward
          </Button>
        )}
      </Group>
      <Group justify="space-between" mt="md">
        <Button size="lg" variant={"light"} onClick={() => form.reset()}>
          Cancel
        </Button>
        <Button onClick={handleCreate} size="lg" disabled={!form.isValid()}>
          Create
        </Button>
      </Group>

      <RewardSelectionModal
        opened={rewardSelectionOpened !== null}
        close={() => setRewardSelectionOpened(null)}
        setReward={setReward}
      />
    </Stack>
  );
}
