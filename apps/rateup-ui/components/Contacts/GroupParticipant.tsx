import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useRemoveContactsFromGroup } from "../../backend/campaign/contactGroup/contactGroup.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";

export const ParticipantMenu = ({ contactId, groupId }) => {
  const removeContactsMutation = useRemoveContactsFromGroup(groupId, () => {});
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Remove member",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove this member from group?
        </Text>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () =>
        removeContactsMutation.mutate({ contactIds: [contactId], groupId }),
    });
  };

  return (
    <RateupButtonPrimary
      title="Remove member"
      variant="light"
      size="xs"
      onClick={openDeleteModal}
    />
  );
};
