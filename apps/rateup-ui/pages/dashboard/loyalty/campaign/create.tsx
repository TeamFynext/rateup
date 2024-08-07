import { useState } from "react";
import { useRouter } from "next/router";

import { Box, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useForm } from "@mantine/form";

import { LoyaltyCampaignType } from "@/types/enums";
import { useCreateCampaignMutation } from "@/backend/loyalty/campaign/loyaltyCampaign.query";
import { useRewards } from "@/backend/loyalty/reward/reward.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import {
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { RewardSelectionModal } from "@/components/loyalty/campaign/RewardSelectionModal";
import { RewardCard } from "@/components/loyalty/reward/RewardCard";
import { getLoyaltyCampaignTypeLabel } from "@/utils/enums";

export default function CreateLoyalty() {
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

      <SimpleGrid cols={2}>
        <Box>
          <ContainedTextField
            label="Campaign Name"
            placeholder="Enter Campaign Name"
            required
            {...form.getInputProps("name")}
          />
          <ContainedSelection
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
            <ContainedNumberInput
              label="Max Per Referrer"
              placeholder="Enter Max Per Referrer"
              required
              {...form.getInputProps("maxPerReferrer")}
            />
          ) : null}
          <ContainedNumberInput
            label="Max Per User"
            placeholder="Enter Max Per User"
            required
            {...form.getInputProps("maxPerUser")}
          />
        </Box>

        <Group>
          {form.values.type !== LoyaltyCampaignType.Transaction ? (
            <Box flex={1}>
              <Text mb={"xs"}>Referrer Reward:</Text>
              {referrerReward ? (
                <RewardCard reward={referrerReward} />
              ) : (
                <RateupButtonPrimary
                  variant="outline"
                  onClick={() => setRewardSelectionOpened("referrer")}
                  title="Select Reward"
                />
              )}
            </Box>
          ) : null}
          <Box flex={1}>
            <Text mb={"xs"}>User Reward:</Text>
            {userRewardId ? (
              <RewardCard reward={userRewardId} />
            ) : (
              <RateupButtonPrimary
                variant="outline"
                onClick={() => setRewardSelectionOpened("user")}
                title="Select Reward"
              />
            )}
          </Box>
        </Group>
      </SimpleGrid>
      <Group justify="flex-end" mt="md">
        <RateupButtonPrimary
          title="Clear"
          variant={"light"}
          onClick={() => form.reset()}
          size="md"
        />
        <RateupButtonPrimary
          title="Create"
          onClick={handleCreate}
          disabled={!form.isValid()}
          size="md"
        />
      </Group>

      <RewardSelectionModal
        opened={rewardSelectionOpened !== null}
        close={() => setRewardSelectionOpened(null)}
        setReward={setReward}
      />
    </Stack>
  );
}
