import { useRouter } from "next/router";

import { Group, Menu, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import CreatedSinceText from "@/components/DateAndTime/CreatedSinceText";
import { CardMenu } from "@/components/whatsapp/automation/AutomationCards";

import { useDeleteRewardMutation } from "../../../backend/loyalty/reward/reward.query";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { LoyaltyPoint } from "../Action/LoyaltyActionCard";

export function RewardCard({ reward }) {
  const router = useRouter();
  return (
    <PaperLayout
      style={{
        cursor: "pointer",
      }}
      onClick={() => router.push(`/dashboard/loyalty/rewards/${reward.id}`)}
    >
      <Stack gap={"lg"}>
        <Group justify="space-between">
          <Title order={3}>{reward.name}</Title>
          <CardMenu>
            <RewardCardMenuItems rewardId={reward.id} />
          </CardMenu>
        </Group>
        <Group justify="space-between">
          <LoyaltyPoint points={reward?.points} />
          <CreatedSinceText createdAt={reward.createdAt} />
        </Group>
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
  const translations = useTranslations();
  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          {translations("Delete")}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={translations(
          "Are you sure you want to delete this Reward?",
        )}
        headerTitle={translations("Delete Reward")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </>
  );
}
