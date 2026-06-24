import { Button, Center, Modal } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useCallback } from "react";

import { useSetLinktreeEditorTab } from "../LinktreeContext/LinktreeContext.tsx";

import styles from "../../../Modal/ImageCropModal.module.css";

function NoLinksFoundModal({ opened, onClose }) {
  const setLinktreeEditorTab = useSetLinktreeEditorTab();
  const handleGotoLinksPageBtnClick = useCallback(() => {
    setLinktreeEditorTab("links");
    onClose();
  }, []);
  return (
    <Modal
      onClose={onClose}
      opened={opened}
      centered
      classNames={{
        content: styles["modal-content"],
        header: styles["modal-header"],
        body: styles["modal-body"],
      }}
      styles={{ content: { borderRadius: "1rem" } }}
    >
      <Center style={{ padding: "1.5rem", flexDirection: "column", gap: "1.5rem" }}>
        <h2>No Links Found</h2>
        <Button onClick={handleGotoLinksPageBtnClick} rightSection={<IconChevronRight />}>
          Go to Links Page
        </Button>
      </Center>
    </Modal>
  );
}

export default NoLinksFoundModal;
