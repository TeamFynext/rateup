import { Button, Center, Modal } from "@mantine/core";
import styles from "../../../Modal/ImageCropModal.module.css";
import { IconChevronRight } from "@tabler/icons-react";
import { useCallback } from "react";
import { useRouter } from "next/router";
import { useSetLandingPageEditorTab } from "../LandingPageContext/LandingPageContext";

function NoLinksFoundModal({ opened, onClose }) {
  const setLandingPageEditorTab = useSetLandingPageEditorTab();
  const handleGotoLinksPageBtnClick = useCallback(() => {
    setLandingPageEditorTab("links");
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
    >
      <Center
        style={{ padding: "1.5rem", flexDirection: "column", gap: "1.5rem" }}
      >
        <h2>No Links Found</h2>
        <Button
          onClick={handleGotoLinksPageBtnClick}
          rightSection={<IconChevronRight />}
        >
          Go to Links Page
        </Button>
      </Center>
    </Modal>
  );
}

export default NoLinksFoundModal;
