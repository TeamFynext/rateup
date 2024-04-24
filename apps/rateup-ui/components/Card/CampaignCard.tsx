import {
  Badge,
  Group,
  Stack,
  Title,
  Text,
  Menu,
  ActionIcon,
} from "@mantine/core";
import { useTeamsByUser } from "../../backend/team/team.query";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useDeleteCampaignMutation } from "../../backend/campaign/campaign.query";
import PaperLayout from "../styled/Layouts/PaperLayout";

const CampaignCard = ({ campaign }) => {
  const router = useRouter();
  const { data: teamsData } = useTeamsByUser();
  const teamObj = teamsData?.data?.find((team) => {
    return team?.id === campaign?.teamId;
  });

  return (
    <>
      <PaperLayout
        p={"md"}
        hoveractive
        onClick={() => {
          router.push(`campaign/${campaign?.id}`);
        }}
      >
        <Stack gap={"md"}>
          <Group justify="space-between">
            <Title order={3}>{campaign?.name}</Title>
            <CampaignMenu campaign={campaign} />
          </Group>
          <Group justify={"space-between"}>
            <Group>
              <Title order={3} c="#149a8a">
                {campaign?._count.campaignParticipants}
              </Title>
              <Text c="dimmed">responses</Text>
            </Group>
            <Badge
              color={renderBadge(campaign?.status).color}
              variant={renderBadge(campaign?.status).variant}
              radius={"sm"}
              size={"lg"}
              styles={{
                label: { textTransform: "capitalize" },
              }}
            >
              {campaign?.status}
            </Badge>
          </Group>
          <Group justify={"space-between"}>
            <Text c="dimmed">
              created on {dayjs(campaign?.createdAt).format("DD-MM-YYYY")}
            </Text>
            <Badge variant="outline" size="lg">
              {teamObj?.name}
            </Badge>
          </Group>
        </Stack>
      </PaperLayout>
    </>
  );
};

const CampaignMenu = ({ campaign }) => {
  const deleteCampaignMutation = useDeleteCampaignMutation(campaign?.teamId);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete Campaign",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this campaign? This action is
          destructive and you will have to contact support to restore your data.
        </Text>
      ),
      labels: { confirm: "Yes", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteCampaignMutation.mutate(campaign?.id),
      onCancel: () => modals.closeAll(),
    });
  };
  return (
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDots color="grey" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item
          color="red"
          leftSection={<IconTrash />}
          onClick={openDeleteModal}
        >
          Delete campaign
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export const renderBadge = (badgeType) => {
  switch (badgeType) {
    case CampaignStatus.ACTIVE:
    case CampaignParticipantStatus.SENT:
      return { variant: "light", color: "#149A8A" };
    case CampaignStatus.INACTIVE:
    case CampaignParticipantStatus.FAILED:
      return { variant: "light", color: "red" };
    case CampaignStatus.COMPLETED:
      return { variant: "filled", color: "#149A8A" };
    default:
      return { variant: "filled", color: "#149A8A" };
  }
};

export default CampaignCard;
