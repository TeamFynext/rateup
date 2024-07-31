import { Box, Center, Group, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import useTranslations from "@/dictionaries/useTranslation";

import PreviewDeviceButtons from "./components/PreviewDeviceButtons";
import SaveButton from "./components/SaveButton";
import ThemeSelector from "./components/ThemeSelector";
import { ThemeTabEnum } from "./SurveyTheme.enums";
import styles from "./SurveyTheme.module.css";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";

const cx = classNames.bind(styles);

function SurveyTheme({
  survey,
  initialSelectedPageTab = undefined,
  closeStylesEditorDrawer = null,
  allThemesArr,
  themeSelectorState,
  setThemeSelectorState,
  isAllThemesFetchPending,
  isThemeObjBeingEditedDefaultTheme,
  themeObjBeingEdited,
}) {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  const { translations, loadingTranslations } = useTranslations();

  if (!surveyTheme)
    return (
      <Center h={"100%"}>
        <p>{translations["Unable to get theme, please try again later"]}</p>
      </Center>
    );

  return (
    <Box className={`${cx("survey-theme-root-div")} survey-theme-root-div`}>
      <Stack className={styles["survey-editor-page-header"]}>
        <Group gap={"2rem"} justify="space-between">
          {initialSelectedPageTab === ThemeTabEnum.SURVEY && (
            <ThemeSelector
              className={cx("theme-selector-div")}
              allThemesArr={allThemesArr}
              themeSelectorState={themeSelectorState}
              setThemeSelectorState={setThemeSelectorState}
              isAllThemesFetchPending={isAllThemesFetchPending}
              survey={survey}
            />
          )}
          <SaveButton
            className={styles["survey-editor-page-header-save-btn"]}
            survey={survey}
            isThemeObjBeingEditedDefaultTheme={
              isThemeObjBeingEditedDefaultTheme
            }
            themeObjBeingEdited={themeObjBeingEdited}
            onSave={() => {
              closeStylesEditorDrawer?.();
            }}
          />
        </Group>
      </Stack>

      <Box
        className={`${cx("selected-page-tab-panels-and-styles-div-container")} selected-page-tab-panels-and-styles-div-container`}
      >
        <Box
          className={`${cx("theme-preview-container")} theme-preview-container`}
        >
          <PreviewDeviceButtons />
          <SurveyThemePreviewLayout
            survey={survey}
            isThemeObjBeingEditedDefaultTheme={
              isThemeObjBeingEditedDefaultTheme
            }
          />
        </Box>
      </Box>
    </Box>
  );
}

export default SurveyTheme;
