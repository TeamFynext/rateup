"use client";

import { Modal } from "@mantine/core";
import { useExtracted } from "next-intl";

import modalStyles from "@/styles/commonCssModules/modal.module.css";

import { elementsToBeTranslated } from "./constants";
import EditTranslations from "./EditTranslations";
import styles from "./UiTextTranslationsModal.module.css";

function UiTextTranslationsModal({ opened, onClose, survey }) {
  const lanugages = survey?.languages;
  const uiTextTranslations = survey?.uiTextTranslations;
  const translations = useExtracted();

  return (
    <Modal
      className={`${styles["ui-text-translations-modal"]}`}
      opened={opened}
      onClose={onClose}
      title={translations("UI Text Translations")}
      classNames={{
        content: modalStyles["modal-content"],
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
      }}
      centered
      size={"lg"}
    >
      {elementsToBeTranslated.map((elementObj) => {
        return (
          <EditTranslations
            key={elementObj?.id}
            element={elementObj}
            uiTextTranslations={uiTextTranslations}
            languages={lanugages}
            survey={survey}
          />
        );
      })}
    </Modal>
  );
}

export default UiTextTranslationsModal;
