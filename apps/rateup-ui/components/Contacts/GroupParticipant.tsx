"use client";

import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useTranslations } from "next-intl";

import { useRemoveContactsFromGroup } from "../../backend/campaign/contactGroup/contactGroup.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";

export const ParticipantMenu = ({ contactId, groupId }) => {
  const removeContactsMutation = useRemoveContactsFromGroup(groupId);
  const translations = useTranslations();
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: translations("Remove member"),
      centered: true,
      children: (
        <Text size="sm">
          {translations(
            "Are you sure you want to remove this member from group?",
          )}
        </Text>
      ),
      labels: { confirm: translations("Ok"), cancel: translations("cancel") },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () =>
        removeContactsMutation.mutate({ contactIds: [contactId], groupId }),
    });
  };

  return (
    <RateupButtonPrimary
      title={translations("Remove member")}
      variant="light"
      size="xs"
      onClick={openDeleteModal}
    />
  );
};
