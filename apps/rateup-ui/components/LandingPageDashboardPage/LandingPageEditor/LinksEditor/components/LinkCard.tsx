import { Box, Button } from "@mantine/core";
import styles from "../LinksEditor.module.css";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";

function LinkCard({ linkObj, onDelete }) {
  const { linkDisplayName, linkUrl } = linkObj;
  return (
    <Box className={styles["link-card"]}>
      <Box className={styles["drag-handle-icon-and-link-info-container"]}>
        <Box className={styles["drag-handle-div"]}>
          <IconGripVertical size={"1.25rem"} />
        </Box>
        <Box className={styles["title-and-url-container"]}>
          <h2>{linkDisplayName}</h2>
          <p>{linkUrl}</p>
        </Box>
      </Box>

      <Box className={styles["delete-btn-container"]}>
        <Button
          className={styles["delete-btn"]}
          leftSection={<IconTrash size={"0.875rem"} />}
          onClick={() => onDelete(linkObj.id)}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

export default LinkCard;
