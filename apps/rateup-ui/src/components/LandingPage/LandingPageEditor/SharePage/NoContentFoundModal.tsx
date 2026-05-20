"use client";

import { useCallback } from "react";

import { Button, Center, Modal } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import styles from "../../../Modal/ImageCropModal.module.css";
import { useSetLandingPageEditorTab } from "../LandingPageContext/LandingPageContext.tsx";

function NoContentFoundModal({ opened, onClose }) {
  const setLandingPageEditorTab = useSetLandingPageEditorTab();
  const { t: translations } = useTranslation();
  const handleGotoEditPageBtnClick = useCallback(() => {
    setLandingPageEditorTab("edit");
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
      <Center
        style={{ padding: "1.5rem", flexDirection: "column", gap: "1.5rem" }}
      >
        <h2>{translations("No Content Found")}</h2>
        <Button
          onClick={handleGotoEditPageBtnClick}
          rightSection={<IconChevronRight />}
          style={{ borderRadius: "1rem" }}
        >
          {translations("Go to edit Page")}
        </Button>
      </Center>
    </Modal>
  );
}

export default NoContentFoundModal;
