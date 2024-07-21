import { useCallback, useState } from "react";
import { useRouter } from "next/router";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";
import { Button, Flex } from "@mantine/core";

import { useTiptapEditorInstance } from "../../LandingPageContext/LandingPageContext";
import styles from "./SaveButton.module.css";

function SaveButton() {
  const editorInstance = useTiptapEditorInstance();

  const [isSaving, setIsSaving] = useState(false);

  const {
    query: { shortUrlId },
  } = useRouter();
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);

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
        Save
      </Button>
    </Flex>
  );
}

export default SaveButton;
