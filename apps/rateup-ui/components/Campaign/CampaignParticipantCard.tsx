import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useRemoveCampaignParticipant } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";
import { CampaignStatus } from "../../types/enums";
import { RateupButtonPrimary } from "../Button/RateupButtons";

export const CampaignParticipantMenu = ({ id, status, participantId }) => {
  const removeCampainPartcipant = useRemoveCampaignParticipant(id);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Remove contact",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this participant from campaign?
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
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
    <RateupButtonPrimary
      title="Remove participant"
      variant="light"
      size="xs"
      onClick={openDeleteModal}
      disabled={status == CampaignStatus.ACTIVE}
    />
  );
};
