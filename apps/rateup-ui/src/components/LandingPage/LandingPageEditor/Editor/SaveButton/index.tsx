import { Button, Flex } from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";

import { useTiptapEditorInstance } from "../../LandingPageContext/LandingPageContext.tsx";

import styles from "./SaveButton.module.css";

function SaveButton() {
  const editorInstance = useTiptapEditorInstance();

  const [isSaving, setIsSaving] = useState(false);

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const { mutateAsync: landingPageUpdateMutateAsync } = useUpdateLandingPageMutation(shortUrlId);
  const { t: translations } = useTranslation();
  const handleSaveBtnClick = useCallback(async () => {
    setIsSaving(true);
    if (editorInstance) {
      try {
        await landingPageUpdateMutateAsync({
          shortUrlId,
          tiptapEditorContent: editorInstance.getHTML(),
        });
      } catch {
        setIsSaving(false);
      }
    }
    setIsSaving(false);
  }, [landingPageUpdateMutateAsync, editorInstance]);

  return (
    <Flex className={styles["save-btn-container"]}>
      <Button className={styles["save-btn"]} onClick={handleSaveBtnClick} loading={isSaving}>
        {translations("Save")}
      </Button>
    </Flex>
  );
}

export default SaveButton;
