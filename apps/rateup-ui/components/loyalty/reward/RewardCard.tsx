import { useRouter } from "next/router";

import { ActionIcon, Group, Menu, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { useDeleteRewardMutation } from "../../../backend/loyalty/reward/reward.query";
import { useTimeSince } from "../../../hooks/timeSince";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { CardMenu } from "../campaign/LCampaignCard";
import { RewardTypeBadge } from "./RewardTypeBadge";

export function RewardCard({ reward }) {
  const timeSince = useTimeSince(reward.createdAt);
  const router = useRouter();
  const { translations } = useTranslations();
  return (
    <PaperLayout
      maw="300px"
      h="150px"
      style={{
        cursor: "pointer",
      }}
      onClick={() => router.push(`/dashboard/loyalty/reward/${reward.id}`)}
    >
      <Stack>
        <Group justify="space-between">
          <Title order={3}>{reward.name}</Title>
          <CardMenu>
            <RewardCardMenuItems rewardId={reward.id} />
          </CardMenu>
        </Group>
        <RewardTypeBadge type={reward.type} />
        <Text
          style={{
            alignSelf: "flex-end",
          }}
          fz="sm"
          c="dimmed"
        >
          {`${translations["Created"]} ${timeSince}`}
        </Text>
      </Stack>
    </PaperLayout>
  );
}

function RewardCardMenuItems({ rewardId }) {
  const deleteMutation = useDeleteRewardMutation();
  const [deleteDialogOpened, { open, close }] = useDisclosure();

  function handleDelete() {
    deleteMutation.mutate(rewardId, {
      onSuccess: close,
    });
  }
  const { translations } = useTranslations();
  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          {translations["Delete"]}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={
          translations["Are you sure you want to delete this Reward?"]
        }
        headerTitle={translations["Delete Reward"]}
        confirmLabel={translations["Delete"]}
        onConfirm={handleDelete}
      />
    </>
  );
}
