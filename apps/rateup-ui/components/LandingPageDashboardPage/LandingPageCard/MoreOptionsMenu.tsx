import {
  ActionIcon,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
} from "@mantine/core";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import styles from "./LandingPageCard.module.css";
import { useCallback, useState } from "react";
import { useRouter } from "next/router";
import { useDeleteLandingPageMutation } from "../../../backend/landingPage/landingPage.query";
import { useDisclosure } from "@mantine/hooks";
import CreateLandingPageModal from "../CreateLandingPageModal";

function MoreOptionsMenu({ shortUrlId, id, initialName }) {
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
    deleteLandingPageMutation.mutateAsync();
  }, [deleteLandingPageMutation]);

  const handleRenameClick = () => {
    editLandingPageModalHandlers.open();
  };

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
          initialName={initialName}
        />
      )}
    </>
  );
}

export default MoreOptionsMenu;
