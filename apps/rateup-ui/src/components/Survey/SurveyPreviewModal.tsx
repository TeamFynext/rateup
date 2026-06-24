import { ActionIcon, Box, Group, Modal, Stack } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import styles from "./SurveyPreviewModal.module.css";

function SurveyPreviewModal({ opened, onClose, children }) {
  return (
    <Box className={styles["survey-preveiw-modal-container"]}>
      <Modal
        className={styles["survey-preview-modal"]}
        opened={opened}
        withinPortal={false}
        onClose={onClose}
        withCloseButton={false}
        withOverlay={false}
        size={"100%"}
      >
        <Stack className={styles["close-btn-preview-container"]} align="center" gap={0}>
          <Group justify="center">
            <ActionIcon className={styles["close-btn"]} variant="subtle" onClick={onClose}>
              <IconX color="gray" />
            </ActionIcon>
          </Group>
          <Box className={styles["preview-container-div"]}>{children}</Box>
        </Stack>
      </Modal>
    </Box>
  );
}

export default SurveyPreviewModal;
