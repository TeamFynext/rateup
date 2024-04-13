import { Button, Group, Text } from "@mantine/core";
import { useUpdateSurveyTheme } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { useCallback, useContext, useState } from "react";
import { SurveyThemeContext } from "../../SurveyThemeContext";
import _ from "lodash";
import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import styles from "./SaveButton.module.css";
import { useHotkeys } from "@mantine/hooks";
import { SAVE_HOTKEY } from "../../../../../utils/constants";

function SaveButton({ survey, themeSelectorState, allThemesArr }) {
  const themeObjBeingEdited = allThemesArr?.find(
    (obj) => obj.id === themeSelectorState,
  );

  const { surveyTheme: themeObjState } = useContext(SurveyThemeContext);
  let themeObjFromApi = themeObjState;
  if (themeObjBeingEdited) {
    themeObjFromApi = themeObjBeingEdited.theme;
  }

  const hasUnsavedChanges = !_.isEqual(themeObjFromApi, themeObjState);

  const [isSaving, setIsSaving] = useState(false);

  const updateSurveyTheme = useUpdateSurveyTheme(
    themeObjBeingEdited?.id,
    survey?.id,
  );

  const handleSaveTheme = useCallback(async () => {
    setIsSaving(true);
    const themeObjStateCopy = _.cloneDeep(themeObjState);
    const {
      surveyTheme: { logo: orgLogoStylesObj },
    } = themeObjStateCopy;
    let orgLogoStylesObject = orgLogoStylesObj;
    if (!orgLogoStylesObject) {
      orgLogoStylesObject = {
        logo: "",
        styles: {
          width: 50,
          height: 50,
        },
      };
      themeObjStateCopy.surveyTheme.logo = orgLogoStylesObject;
    }
    const newSurveyTheme =
      await destructureThemeAndUploadImagesIfAny(themeObjStateCopy);

    await updateSurveyTheme.mutateAsync({
      surveyThemeId: themeObjBeingEdited?.id,
      body: {
        surveyId: survey?.id,
        theme: newSurveyTheme,
      },
    });
    setIsSaving(false);
  }, [themeObjBeingEdited, themeObjState]);

  useHotkeys([[SAVE_HOTKEY, handleSaveTheme]]);

  return (
    <Group justify="center" w="100%">
      <Text
        className={styles["save-unsaved-text-p"]}
        style={{ color: hasUnsavedChanges ? "red" : "green" }}
      >
        {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
      </Text>
      <Button
        className={styles["save-btn"]}
        loading={isSaving}
        onClick={handleSaveTheme}
      >
        Save
      </Button>
    </Group>
  );
}

export default SaveButton;
