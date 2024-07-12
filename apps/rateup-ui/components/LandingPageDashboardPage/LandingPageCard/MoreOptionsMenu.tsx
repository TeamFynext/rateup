import {
  ActionIcon,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Text,
} from "@mantine/core";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import styles from "./LandingPageCard.module.css";
import { useCallback } from "react";
import { useRouter } from "next/router";
import { useDeleteLandingPageMutation } from "../../../backend/landingPage/landingPage.query";
import { useDisclosure } from "@mantine/hooks";
import CreateLandingPageModal from "../CreateLandingPageModal";
import { modals } from "@mantine/modals";
import modalStyles from "styles/commonCssModules/modal.module.css";

function MoreOptionsMenu({ shortUrlId, id, name }) {
  const router = useRouter();

  const [isEditLandingPageModalOpen, editLandingPageModalHandlers] =
    useDisclosure();

  const deleteLandingPageMutation = useDeleteLandingPageMutation(id);

  const handleShareClick = useCallback(() => {
    router.push({
      pathname: `/dashboard/landingPages/${shortUrlId}`,
      query: { tab: "share" },
    });
  }, [shortUrlId]);

  const handleDeleteClick = useCallback(async () => {
    // deleteLandingPageMutation.mutateAsync();
    modals.openConfirmModal({
      title: "Delete Landing Page?",
      children: (
        <Text className={styles["are-you-sure-text"]}>
          Are you sure to delete this Landing Page?
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
      onConfirm: () => deleteLandingPageMutation.mutateAsync(),
    });
  }, [deleteLandingPageMutation]);

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
          <MenuItem leftSection={<IconShare />} onClick={handleShareClick}>
            Share
          </MenuItem>
          <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
            Delete
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
