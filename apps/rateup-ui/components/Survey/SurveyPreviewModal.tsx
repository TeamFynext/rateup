import { Box, Button, Group, Modal, Stack } from "@mantine/core";

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
        <Stack>
          <Group justify="center">
            <Button className={styles["close-btn"]} onClick={onClose}>
              Close Preveiw
            </Button>
          </Group>
          {children}
        </Stack>
      </Modal>
    </Box>
  );
}

export default SurveyPreviewModal;
