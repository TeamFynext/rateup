import {
  ActionIcon,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Text,
} from "@mantine/core";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { useRouter } from "next/router";

import { useDisclosure } from "@mantine/hooks";
import CreateShortUrlModal from "../CreateQrModal";
import { modals } from "@mantine/modals";
import modalStyles from "styles/commonCssModules/modal.module.css";
import styles from "./GeneratedQrCard.module.css";
import { useDeleteQrMutation } from "backend/generateQr/generateQr.query";

function MoreOptionsMenu({ shortUrlId, name }) {
  const [isEditLandingPageModalOpen, editLandingPageModalHandlers] =
    useDisclosure();

  const deleteQrMutation = useDeleteQrMutation();

  const handleDeleteClick = useCallback(async () => {
    // deleteLandingPageMutation.mutateAsync();
    modals.openConfirmModal({
      title: "Delete QR?",
      children: (
        <Text className={styles["are-you-sure-text"]}>
          Are you sure to delete this QR?
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
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

  const handleRenameClick = useCallback((e) => {
    editLandingPageModalHandlers.open();
  }, []);

  return (
    <>
      <Menu width={150}>
        <MenuTarget>
          <ActionIcon
            onClick={(e) => e.stopPropagation()}
            className={styles["more-options-btn"]}
          >
            <IconDots />
          </ActionIcon>
        </MenuTarget>
        <MenuDropdown onClick={(e) => e.stopPropagation()}>
          <MenuItem leftSection={<IconEdit />} onClick={handleRenameClick}>
            Rename
          </MenuItem>
          <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
            Delete
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
