import { Button, Group, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import _ from "lodash";
import { useCallback, useState } from "react";
import { useUpdateSurveyTheme } from "../../../../../backend/surveyTheme/surveyTheme.query";
import { docsPath, SAVE_HOTKEY } from "../../../../../utils/constants";
import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import { useSurveyThemeContextValue } from "../../SurveyThemeContext";
import styles from "./SaveButton.module.css";
import InfoButton from "../../../../Button/InfoButton";

function SaveButton({ survey, themeSelectorState, allThemesArr }) {
  const themeObjBeingEdited = allThemesArr?.find(
    (obj) => obj.id === themeSelectorState,
  );

  const themeObjState = useSurveyThemeContextValue();
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

    const {
      surveyTheme: { logo: orgLogoStylesObj },
    } = themeObjState;

    let finalThemeObj = themeObjState;
    if (!orgLogoStylesObj) {
      finalThemeObj = _.cloneDeep(themeObjState);
      finalThemeObj.surveyTheme.logo = {
        logo: "",
        styles: {
          width: 50,
          height: 50,
        },
      };
    }

    const newSurveyTheme =
      await destructureThemeAndUploadImagesIfAny(finalThemeObj);

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
      <InfoButton docUrl={`${docsPath}/webSurvey/surveyTheme/themes`} />
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
