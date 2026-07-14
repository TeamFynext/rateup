import { useTranslation } from "react-i18next";

import { useRemoveContactsFromGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useConfirm } from "@/context/confirm-provider";

import { Button } from "../ui/button.tsx";

export const ParticipantMenu = ({ contactId, groupId }) => {
  const removeContactsMutation = useRemoveContactsFromGroup(groupId);
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const openDeleteModal = async () => {
    const ok = await confirm({
      title: translations("Remove member"),
      description: translations("Are you sure you want to remove this member from group?"),
      confirmText: translations("Ok"),
      cancelText: translations("cancel"),
    });
    if (!ok) return;
    removeContactsMutation.mutate({ contactIds: [contactId], groupId });
  };

  return (
    <Button variant="secondary" size="sm" onClick={openDeleteModal}>
      {translations("Remove member")}
    </Button>
  );
};
