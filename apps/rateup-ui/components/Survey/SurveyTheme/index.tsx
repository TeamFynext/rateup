import { useState } from "react";

import { Box, Button, Center, Group, Stack } from "@mantine/core";
import { IconEdit, IconPencil } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { useAllThemes } from "../../../backend/surveyTheme/surveyTheme.query";
import PageSelector from "./components/PageSelector";
import PreviewDeviceButtons from "./components/PreviewDeviceButtons";
import SaveButton from "./components/SaveButton";
import StylesComponent from "./components/stylescomponent";
import ThemeSelector from "./components/ThemeSelector";
import WelcomePageSwitch from "./components/WelcomePageSwitch";
import { ThemeTabEnum } from "./SurveyTheme.enums";
import styles from "./SurveyTheme.module.css";
import { SurveyThemeContextProvider } from "./SurveyThemeContext";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";

const cx = classNames.bind(styles);

function SurveyTheme({ survey, initialSelectedPageTab = undefined }) {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  // selected surveyThemeId.
  const [themeSelectorState, setThemeSelectorState] = useState(
    survey?.webSurveyThemeId,
  );

  const { data: allThemesArr, isPending: isAllThemesFetchPending } =
    useAllThemes();

  const themeObjBeingEdited = allThemesArr?.find(
    (obj) => obj.id === themeSelectorState,
  );
  const isThemeObjBeingEditedDefaultTheme =
    themeObjBeingEdited?.name === "Default Theme";

  const [isSurveyThemeEditorOpen, setIsSurveyThemeEditorOpen] = useState(false);

  if (!surveyTheme)
    return (
      <Center h={"100%"}>
        <p>Unable to get theme, please try again later</p>
      </Center>
    );

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyTheme}
      selectedPageTab={initialSelectedPageTab}
    >
      <Box className={`${cx("survey-theme-root-div")} survey-theme-root-div`}>
        {!initialSelectedPageTab && (
          <Group
            className={`${cx("tabs-and-other-options-container")} tabs-and-other-options-container`}
          >
            <Box></Box>

            {!initialSelectedPageTab ? (
              <PageSelector survey={survey} />
            ) : (
              <Box></Box>
            )}

            <Box
              className={cx("save-btn-container")}
              id="save-btn-container-portal"
            >
              <SaveButton
                survey={survey}
                isThemeObjBeingEditedDefaultTheme={
                  isThemeObjBeingEditedDefaultTheme
                }
                themeObjBeingEdited={themeObjBeingEdited}
              />
            </Box>
          </Group>
        )}

        {initialSelectedPageTab === ThemeTabEnum.SURVEY && (
          // This Will be dispayed only in the survey editor page to edit welcome and thankyou pages.
          <Stack className={styles["survey-editor-page-header"]}>
            <Group justify="space-between">
              <ThemeSelector
                className={cx("theme-selector-div")}
                allThemesArr={allThemesArr}
                themeSelectorState={themeSelectorState}
                setThemeSelectorState={setThemeSelectorState}
                isAllThemesFetchPending={isAllThemesFetchPending}
                survey={survey}
              />
              <Button
                className={styles["open-close-survey-editor-btn"]}
                leftSection={<IconEdit size={"1rem"} />}
                onClick={() =>
                  setIsSurveyThemeEditorOpen(!isSurveyThemeEditorOpen)
                }
              >
                {isSurveyThemeEditorOpen ? "Close Editor" : "Open Editor"}
              </Button>
              <SaveButton
                className={styles["survey-editor-page-header-save-btn"]}
                survey={survey}
                isThemeObjBeingEditedDefaultTheme={
                  isThemeObjBeingEditedDefaultTheme
                }
                themeObjBeingEdited={themeObjBeingEdited}
              />
            </Group>

            {isSurveyThemeEditorOpen && (
              <StylesComponent
                survey={survey}
                isThemeObjBeingEditedDefaultTheme={
                  isThemeObjBeingEditedDefaultTheme
                }
                themeObjBeingEdited={themeObjBeingEdited}
                useTabsForEditorSelection
              />
            )}
          </Stack>
        )}

        {initialSelectedPageTab &&
          !(initialSelectedPageTab === ThemeTabEnum.SURVEY) && (
            <Stack className={styles["survey-editor-page-header"]}>
              <StylesComponent
                survey={survey}
                isThemeObjBeingEditedDefaultTheme={
                  isThemeObjBeingEditedDefaultTheme
                }
                themeObjBeingEdited={themeObjBeingEdited}
                useTabsForEditorSelection
                displaySaveBtn
              />
            </Stack>
          )}

        <Box
          className={`${cx("selected-page-tab-panels-and-styles-div-container")} selected-page-tab-panels-and-styles-div-container`}
        >
          <Box
            className={`${cx("theme-preview-container")} theme-preview-container`}
          >
            <PreviewDeviceButtons />
            <WelcomePageSwitch survey={survey} />
            <SurveyThemePreviewLayout
              survey={survey}
              isThemeObjBeingEditedDefaultTheme={
                isThemeObjBeingEditedDefaultTheme
              }
            />
          </Box>

          {!initialSelectedPageTab && (
            <Box
              className={`${cx("theme-selector-org-logo-styles-component-container")} theme-selector-org-logo-styles-component-container`}
            >
              <ThemeSelector
                className={cx("theme-selector-div")}
                allThemesArr={allThemesArr}
                themeSelectorState={themeSelectorState}
                setThemeSelectorState={setThemeSelectorState}
                isAllThemesFetchPending={isAllThemesFetchPending}
                survey={survey}
              />
              <Box className={cx("styles-component-container")}>
                <StylesComponent
                  survey={survey}
                  isThemeObjBeingEditedDefaultTheme={
                    isThemeObjBeingEditedDefaultTheme
                  }
                  themeObjBeingEdited={themeObjBeingEdited}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </SurveyThemeContextProvider>
  );
}

export default SurveyTheme;
