import { ActionIcon, Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { useDeleteLinktreeMutation } from "@/backend/linktree/linktree.query";

import CreateLinktreeModal from "../CreateLinktreeModal/index.tsx";

import styles from "./LinktreeCard.module.css";
import modalStyles from "@/styles/commonCssModules/modal.module.css";

function MoreOptionsMenu({ shortUrlId, id, name }) {
  const navigate = useNavigate();

  const [isEditLinktreeModalOpen, editLinktreeModalHandlers] = useDisclosure();

  const deleteLinktreeMutation = useDeleteLinktreeMutation(id);

  const handleShareClick = useCallback(() => {
    navigate({
      to: `/dashboard/quickAccessLinks/${shortUrlId}?tab=share`,
    });
  }, [shortUrlId]);

  const handleDeleteClick = useCallback(async () => {
    // deleteLinktreeMutation.mutateAsync();
    modals.openConfirmModal({
      title: "Delete Quick Access Link?",
      children: (
        <Text className={styles["are-you-sure-text"]}>
          Are you sure to delete this Quick Access Link?
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
      onConfirm: () => deleteLinktreeMutation.mutateAsync(),
    });
  }, [deleteLinktreeMutation]);

  const handleRenameClick = useCallback((_e) => {
    editLinktreeModalHandlers.open();
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
            Rename
          </MenuItem>
          <MenuItem leftSection={<IconShare />} onClick={handleShareClick}>
            Share
          </MenuItem>
          <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
            Delete
          </MenuItem>
        </MenuDropdown>
      </Menu>

      {isEditLinktreeModalOpen && (
        <CreateLinktreeModal
          opened={isEditLinktreeModalOpen}
          onClose={editLinktreeModalHandlers.close}
          mode="Rename"
          shortUrlId={shortUrlId}
          initialName={name}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
