"use client";

import { ActionIcon, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CampaignParticipantStatus, CampaignStatus } from "@/types/enums.ts";
import { useDeleteCampaignMutation } from "@/backend/campaign/campaign.query";

export const CampaignMenu = ({ teamId, id, campaignType }) => {
  const deleteCampaignMutation = useDeleteCampaignMutation(
    teamId,
    campaignType,
  );
  const { t: translations } = useTranslation();
  const openDeleteModal = (e) => {
    e.stopPropagation();
    modals.openConfirmModal({
      title: translations("Delete Campaign"),
      centered: true,
      children: (
        <Text size="sm">
          {translations(
            "Are you sure you want to delete this campaign? This action is destructive and you will have to contact support to restore your data.",
          )}
        </Text>
      ),
      labels: { confirm: translations("Yes"), cancel: translations("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => deleteCampaignMutation.mutate(id),
      onCancel: () => modals.closeAll(),
    });
  };
  return (
    <ActionIcon
      variant="light"
      radius={"md"}
      onClick={openDeleteModal}
      ml={"md"}
    >
      <IconTrash size={18} />
    </ActionIcon>
  );
};
const statusColors = {
  [CampaignStatus.ACTIVE]: { variant: "light", color: "#149A8A" },
  [CampaignStatus.INACTIVE]: { variant: "light", color: "red" },
  [CampaignParticipantStatus.SENT]: { variant: "light", color: "#149A8A" },
  [CampaignParticipantStatus.FAILED]: { variant: "light", color: "red" },
  [CampaignParticipantStatus.PENDING]: { variant: "light", color: "orange" },
  [CampaignParticipantStatus.READ]: { variant: "light", color: "#4CAF50" },
  [CampaignParticipantStatus.DELIVERED]: { variant: "light", color: "#FFC107" },
  [CampaignParticipantStatus.COMPLETED]: {
    variant: "filled",
    color: "#149A8A",
  },
  [CampaignStatus.SCHEDULED]: { variant: "light", color: "orange" },
};
export const renderBadge = (badgeType) => {
  return statusColors[badgeType] || { variant: "filled", color: "#149A8A" };
};
