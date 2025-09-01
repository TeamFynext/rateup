"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button, Flex } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";

import { useTiptapEditorInstance } from "../../LandingPageContext/LandingPageContext";
import styles from "./SaveButton.module.css";

function SaveButton() {
  const editorInstance = useTiptapEditorInstance();

  const [isSaving, setIsSaving] = useState(false);

  const params = useParams();
  const shortUrlId = params?.shortUrlId as string;
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);
  const translations = useTranslations();
  const handleSaveBtnClick = useCallback(async () => {
    setIsSaving(true);
    if (editorInstance) {
      try {
        await landingPageUpdateMutateAsync({
          shortUrlId,
          tiptapEditorContent: editorInstance.getHTML(),
        });
      } catch (err) {
        setIsSaving(false);
      }
    }
    setIsSaving(false);
  }, [landingPageUpdateMutateAsync, editorInstance]);

  return (
    <Flex className={styles["save-btn-container"]}>
      <Button
        className={styles["save-btn"]}
        onClick={handleSaveBtnClick}
        loading={isSaving}
      >
        {translations("Save")}
      </Button>
    </Flex>
  );
}

export default SaveButton;
