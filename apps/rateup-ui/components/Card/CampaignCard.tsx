import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useDeleteCampaignMutation } from "../../backend/campaign/campaign.query";
import { CampaignParticipantStatus, CampaignStatus } from "../../types/enums";
import { RateupButtonPrimary } from "../Button/RateupButtons";

export const CampaignMenu = ({ teamId, id }) => {
  const deleteCampaignMutation = useDeleteCampaignMutation(teamId);
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
      onConfirm: () => deleteCampaignMutation.mutate(id),
      onCancel: () => modals.closeAll(),
    });
  };
  return (
    <RateupButtonPrimary
      title="Delete campaign"
      variant="light"
      size="xs"
      onClick={openDeleteModal}
    />
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
