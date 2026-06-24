import { ActionIcon, Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteQrMutation } from "@/backend/generateQr/generateQr.query";

import CreateShortUrlModal from "../CreateQrModal/index.tsx";

import styles from "./GeneratedQrCard.module.css";
import modalStyles from "@/styles/commonCssModules/modal.module.css";

function MoreOptionsMenu({ shortUrlId, name }) {
  const [isEditLandingPageModalOpen, editLandingPageModalHandlers] = useDisclosure();

  const deleteQrMutation = useDeleteQrMutation();
  const { t: translations } = useTranslation();
  const handleDeleteClick = useCallback(async () => {
    // deleteLandingPageMutation.mutateAsync();
    modals.openConfirmModal({
      title: translations("Delete QR?"),
      children: (
        <Text className={styles["are-you-sure-text"]}>
          {translations("Are you sure to delete this QR?")}
        </Text>
      ),
      labels: {
        confirm: translations("Delete"),
        cancel: translations("Cancel"),
      },
      className: styles["delete-confirmation-modal"],
      centered: true,
      classNames: {
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      },
      onConfirm: () => deleteQrMutation.mutateAsync(shortUrlId),
    });
  }, [deleteQrMutation]);

  const handleRenameClick = useCallback((_e) => {
    editLandingPageModalHandlers.open();
  }, []);

  return (
    <>
      <Menu width={150}>
        <MenuTarget>
          <ActionIcon onClick={(e) => e.stopPropagation()} className={styles["more-options-btn"]}>
            <IconDots />
          </ActionIcon>
        </MenuTarget>
        <MenuDropdown onClick={(e) => e.stopPropagation()}>
          <MenuItem leftSection={<IconEdit />} onClick={handleRenameClick}>
            {translations("Rename")}
          </MenuItem>
          <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
            {translations("Delete")}
          </MenuItem>
        </MenuDropdown>
      </Menu>
      {isEditLandingPageModalOpen && (
        <CreateShortUrlModal
          opened={isEditLandingPageModalOpen}
          onClose={editLandingPageModalHandlers.close}
          mode="Rename"
          shortUrlId={shortUrlId}
          initialName={name}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
