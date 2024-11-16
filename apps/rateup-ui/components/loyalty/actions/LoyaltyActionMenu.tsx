import React from "react";

import { Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";

import { useDeleteLoyaltyAction } from "@/backend/loyalty/actions/actions.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import useTranslations from "@/dictionaries/useTranslation";

const LoyaltyActionMenu = ({ actionId }) => {
  const { translations } = useTranslations();
  const deleteMutation = useDeleteLoyaltyAction(actionId);
  const [deleteDialogOpened, { open, close }] = useDisclosure();

  function handleDelete() {
    deleteMutation.mutate(null, {
      onSuccess: close,
    });
  }
  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          {translations["Delete"]}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={
          translations["Are you sure you want to delete this action?"]
        }
        headerTitle={translations["Delete Action"]}
        confirmLabel={translations["Delete"]}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default LoyaltyActionMenu;
