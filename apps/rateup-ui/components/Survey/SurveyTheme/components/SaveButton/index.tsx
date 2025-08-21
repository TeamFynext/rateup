import { useCallback, useState } from "react";

import { Button, Group, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import _ from "lodash";
import { useTranslations } from "next-intl";

import { showErrorToast } from "@/utils/notifications";

import { useUpdateSurveyTheme } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { docsPath, SAVE_HOTKEY } from "../../../../../utils/constants";
import InfoButton from "../../../../Button/InfoButton";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
} from "../../SurveyThemeContext";
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
  let themeObjFromApi = themeObjState;
  if (themeObjBeingEdited) {
    themeObjFromApi = themeObjBeingEdited.theme;
  }

  const hasUnsavedChanges = !_.isEqual(themeObjFromApi, themeObjState);
  let saveStatusText = "All changes saved";
  if (hasUnsavedChanges) {
    saveStatusText = "Unsaved changes";
  }
  if (isThemeObjBeingEditedDefaultTheme) {
    saveStatusText = "Default Theme cannot be edited.";
  }

  const [isSaving, setIsSaving] = useState(false);
  const translations = useTranslations();
  const updateSurveyTheme = useUpdateSurveyTheme(
    themeObjBeingEdited?.id,
    survey?.id,
  );

  const handleSaveTheme = useCallback(async () => {
    if (!themeObjBeingEdited?.id) {
      showErrorToast("Please select a theme.", "theme-not-selected-error");
      return;
    }
    setIsSaving(true);

    const newSurveyTheme =
      await destructureThemeAndUploadImagesIfAny(themeObjState);

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
      <Button
        className={styles["save-btn"]}
        loading={isSaving}
        onClick={handleSaveTheme}
      >
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
