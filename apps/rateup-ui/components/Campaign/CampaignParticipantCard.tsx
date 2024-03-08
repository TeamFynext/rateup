import { Paper, Group, Stack, Title, Badge, Text, Menu } from "@mantine/core";
import { renderBadge } from "../Card/CampaignCard";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { CampaignStatus } from "../../types/enums";
import { useRemoveCampaignParticipant } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";

const CampaignParticipantCard = ({ participant, campaign }) => {
  return (
    <>
      <Paper shadow="xl" p="lg" radius={"md"}>
        <Stack gap={0}>
          <Group justify="space-between">
            <Title order={4}>{participant?.contact?.name}</Title>
            <CampaignParticipantMenu
              participantId={participant?.id}
              campaign={campaign}
            />
          </Group>
          <Group justify="space-between">
            <Text c={"dimmed"}>{participant?.contact?.phone}</Text>
            <Badge
              variant={renderBadge(participant?.status).variant}
              color={renderBadge(participant?.status).color}
              radius={"md"}
              size="xl"
            >
              {participant?.status}
            </Badge>
          </Group>
        </Stack>
      </Paper>
    </>
  );
};

const CampaignParticipantMenu = ({ campaign, participantId }) => {
  const removeCampainPartcipant = useRemoveCampaignParticipant(campaign?.id);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Remove contact",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this customer from campaign? This
          action is destructive and you will have to contact support to restore
          your data.
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () =>
        removeCampainPartcipant.mutate({
          participantId,
          campaignId: campaign?.id,
        }),
    });
  };

  return (
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <IconDots color="grey"></IconDots>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="1rem" />}
          onClick={openDeleteModal}
          disabled={campaign?.status == CampaignStatus.ACTIVE}
        >
          Remove participant
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default CampaignParticipantCard;
