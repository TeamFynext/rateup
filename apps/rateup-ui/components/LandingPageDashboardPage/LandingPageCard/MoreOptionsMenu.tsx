import {
  ActionIcon,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
} from "@mantine/core";
import { IconDots, IconShare, IconTrash } from "@tabler/icons-react";
import styles from "./LandingPageCard.module.css";
import { useCallback } from "react";
import { useRouter } from "next/router";
import { useDeleteLandingPageMutation } from "../../../backend/landingPage/landingPage.query";

function MoreOptionsMenu({ shortUrlId, id }) {
  const router = useRouter();

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

  return (
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
        <MenuItem leftSection={<IconShare />} onClick={handleShareClick}>
          Share
        </MenuItem>
        <MenuItem leftSection={<IconTrash />} onClick={handleDeleteClick}>
          Delete
        </MenuItem>
      </MenuDropdown>
    </Menu>
  );
}

export default MoreOptionsMenu;
