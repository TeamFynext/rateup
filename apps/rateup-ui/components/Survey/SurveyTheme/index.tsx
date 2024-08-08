import { Box, Button, Center, Group, Stack } from "@mantine/core";
import { IconEdit, IconPlayerPlay } from "@tabler/icons-react";
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
  closeStylesEditorDrawer,
  allThemesArr,
  themeSelectorState,
  setThemeSelectorState,
  isAllThemesFetchPending,
  isThemeObjBeingEditedDefaultTheme,
  themeObjBeingEdited,
  openStylesEditorDrawer,
  openSurveyPreviewModal,
  previewId,
  isSurveyThemeEditView = false,
}) {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  const { translations, loadingTranslations } = useTranslations();

  if (!surveyTheme)
    return (
      <Center h={"100%"}>
        <p>{translations["Unable to get theme, please try again later"]}</p>
      </Center>
    );

  const isSelectedPagetabSurvey =
    initialSelectedPageTab === ThemeTabEnum.SURVEY;

  return (
    <Box className={`${cx("survey-theme-root-div")} survey-theme-root-div`}>
      <Stack
        className={`${styles["survey-editor-page-header"]} survey-editor-page-header`}
      >
        <Group gap={"2rem"} justify="space-between">
          {isSelectedPagetabSurvey && (
            <ThemeSelector
              className={cx("theme-selector-div")}
              allThemesArr={allThemesArr}
              themeSelectorState={themeSelectorState}
              setThemeSelectorState={setThemeSelectorState}
              isAllThemesFetchPending={isAllThemesFetchPending}
              survey={survey}
            />
          )}

          <Group>
            {isSelectedPagetabSurvey && (
              <Button
                className={styles["preview-survey-btn"]}
                leftSection={<IconPlayerPlay size={"1rem"} />}
                onClick={openSurveyPreviewModal}
              >
                Preview Survey
              </Button>
            )}

            <Button
              className={styles["edit-theme-btn"]}
              leftSection={<IconEdit size={"1rem"} />}
              onClick={() => openStylesEditorDrawer()}
            >
              Edit Theme
            </Button>
          </Group>
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
            previewId={previewId}
            isSurveyThemeEditView={isSurveyThemeEditView}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default SurveyTheme;
