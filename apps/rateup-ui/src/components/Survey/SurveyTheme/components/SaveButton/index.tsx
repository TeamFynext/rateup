import { Button, Group } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateSurveyTheme } from "@/backend/surveyTheme/surveyTheme.query";
import { SAVE_HOTKEY } from "@/utils/constants.ts";

import { ThemeTabEnum } from "../../SurveyTheme.enums";
import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import { useSelectedPageTab, useSurveyThemeContextValue } from "../../SurveyThemeContext.tsx";

import styles from "./SaveButton.module.css";

function SaveButton({
  className = "",
  survey,
  themeObjBeingEdited,
  isThemeObjBeingEditedDefaultTheme,
  onSave = null,
}) {
  const selectedPageTab = useSelectedPageTab();

  const themeObjState = useSurveyThemeContextValue();

  const [isSaving, setIsSaving] = useState(false);
  const { t: translations } = useTranslation();
  const updateSurveyTheme = useUpdateSurveyTheme(themeObjBeingEdited?.id, survey?.id);

  const handleSaveTheme = useCallback(async () => {
    if (!themeObjBeingEdited?.id) {
      toast.error("Please select a theme.", {
        id: "theme-not-selected-error",
      });
      return;
    }
    setIsSaving(true);

    const newSurveyTheme = await destructureThemeAndUploadImagesIfAny(themeObjState);

    await updateSurveyTheme.mutateAsync({
      surveyThemeId: themeObjBeingEdited?.id,
      body: {
        surveyId: survey?.id,
        theme: newSurveyTheme,
      },
    });
    setIsSaving(false);

    onSave?.();
  }, [themeObjBeingEdited, themeObjState]);

  useHotkeys([[SAVE_HOTKEY, handleSaveTheme]]);

  return (
    <Group
      justify="center"
      className={`${styles["save-button-root-div"]} save-button-root-div ${className}`}
    >
      {/* <InfoButton docUrl={`${docsPath}/webSurvey/surveyTheme/themes`} /> */}
      {/* <Text
        className={styles["save-unsaved-text-p"]}
        style={{
          color:
            hasUnsavedChanges || isThemeObjBeingEditedDefaultTheme
              ? "red"
              : "green",
        }}
      >
        {saveStatusText}
      </Text> */}
      <Button className={styles["save-btn"]} loading={isSaving} onClick={handleSaveTheme}>
        {isThemeObjBeingEditedDefaultTheme
          ? translations("Apply")
          : selectedPageTab === ThemeTabEnum.SURVEY
            ? translations("Save & Apply")
            : translations("Save")}
      </Button>
    </Group>
  );
}

export default SaveButton;
