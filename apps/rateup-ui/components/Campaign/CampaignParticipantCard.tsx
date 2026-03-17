"use client";

import { Box, Menu, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconChevronDown, IconSend, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { useSendCampaign } from "../../backend/campaign/campaign.query";
import { useRemoveCampaignParticipant } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { RateupButtonPrimary } from "../Button/RateupButtons";

export const CampaignParticipantMenu = ({
  id,
  status,
  participantId,
  teamId,
  consent,
}) => {
  const removeCampainPartcipant = useRemoveCampaignParticipant(id);
  const sendMutation = useSendCampaign(id, teamId);
  const t = useExtracted("campaign.participantMenu");
  function handleResendClick() {
    sendMutation.mutate({
      participantId,
      statuses: [CampaignParticipantStatus.FAILED],
      sentCampaignChoice: "NOW",
    });
  }
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: t("Remove contact"),
      centered: true,
      children: (
        <Text size="sm">
          {t("Are you sure you want to remove this participant from campaign?")}
        </Text>
      ),
      labels: {
        confirm: t("Ok"),
        cancel: t("Cancel"),
      },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () =>
        removeCampainPartcipant.mutate({
          participantId,
          campaignId: id,
        }),
    });
  };

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <Box>
          <RateupButtonPrimary
            title={t("Select action")}
            variant="light"
            rightIcon={<IconChevronDown size="16px" />}
            size="xs"
          />
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconSend size={"16px"} />}
          onClick={handleResendClick}
          disabled={!consent}
        >
          {t("Resend")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size="16px" />}
          onClick={openDeleteModal}
          disabled={status == CampaignStatus.ACTIVE}
        >
          {t("Remove participant")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
