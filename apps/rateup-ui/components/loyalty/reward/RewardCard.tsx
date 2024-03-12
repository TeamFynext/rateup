import { ActionIcon, Group, Menu, Stack, Text, Title } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { RewardTypeBadge } from "./RewardTypeBadge";
import { useTimeSince } from "../../../hooks/timeSince";
import { useRouter } from "next/router";
import { CardMenu } from "../campaign/LCampaignCard";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteRewardMutation } from "../../../backend/loyalty/reward/reward.query";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../Modal/ConfirmationModal";

export function RewardCard({ reward }) {
  const timeSince = useTimeSince(reward.createdAt);
  const router = useRouter();
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
          {`Created ${timeSince}`}
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

  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel="Are you sure you want to delete this Reward?"
        headerTitle="Delete Reward"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
