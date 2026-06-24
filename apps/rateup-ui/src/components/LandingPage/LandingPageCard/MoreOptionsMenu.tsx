import { ActionIcon, Menu, MenuDropdown, MenuItem, MenuTarget, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteLandingPageMutation } from "@/backend/landingPage/landingPage.query";

import CreateLandingPageModal from "../CreateLandingPageModal/index.tsx";

import styles from "./LandingPageCard.module.css";
import modalStyles from "@/styles/commonCssModules/modal.module.css";

function MoreOptionsMenu({ shortUrlId, id, name }) {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const [isEditLandingPageModalOpen, editLandingPageModalHandlers] = useDisclosure();

  const deleteLandingPageMutation = useDeleteLandingPageMutation(id);

  const handleShareClick = useCallback(() => {
    navigate({
      to: `/dashboard/landingPages/${shortUrlId}?tab=share`,
    });
  }, [shortUrlId]);

  const handleDeleteClick = useCallback(async () => {
    // deleteLandingPageMutation.mutateAsync();
    modals.openConfirmModal({
      title: translations("Delete Landing Page?"),
      children: (
        <Text className={modalStyles["are-you-sure-text"]}>
          {translations("Are you sure to delete this Landing Page?")}
        </Text>
      ),
      labels: {
        confirm: translations("Delete"),
        cancel: translations("Cancel"),
      },
      className: modalStyles["delete-confirmation-modal"],
      centered: true,
      classNames: {
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      },
      onConfirm: () => deleteLandingPageMutation.mutateAsync(),
    });
  }, [deleteLandingPageMutation]);

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
          <MenuItem leftSection={<IconShare />} onClick={handleShareClick}>
            {translations("Share")}
          </MenuItem>
          <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
            {translations("Delete")}
          </MenuItem>
        </MenuDropdown>
      </Menu>
      {isEditLandingPageModalOpen && (
        <CreateLandingPageModal
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
