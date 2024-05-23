import { Box, Center, Group } from "@mantine/core";
import { useState } from "react";
import {
  useAllThemes,
  useSurveyTheme,
} from "../../../backend/surveyTheme/surveyTheme.query";
import RateupLoader from "../../Loaders/RateupLoader";
import PageSelector from "./components/PageSelector";
import PreviewDeviceSelector from "./components/PreviewDeviceSelector";
import SaveButton from "./components/SaveButton";
import StylesComponent from "./components/stylescomponent";
import ThemeSelector from "./components/ThemeSelector";
import styles from "./SurveyTheme.module.css";
import { SurveyThemeContextProvider } from "./SurveyThemeContext";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";
import WelcomePageSwitch from "./components/WelcomePageSwitch";
import PreviewDeviceButtons from "./components/PreviewDeviceButtons";

function SurveyTheme({ survey }) {
  const { data: surveyTheme, isLoading } = useSurveyTheme(
    survey?.webSurveyThemeId,
  );

  // selected surveyThemeId.
  const [themeSelectorState, setThemeSelectorState] = useState(
    survey?.webSurveyThemeId,
  );

  const { data: allThemesArr, isPending: isAllThemesFetchPending } =
    useAllThemes();

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  if (!surveyTheme)
    return (
      <Center h={"100%"}>
        <p>Unable to get theme, please try again later</p>
      </Center>
    );

  return (
    <SurveyThemeContextProvider surveyTheme={surveyTheme}>
      <Box className={styles["survey-theme-root-div"]}>
        <Group className={styles["tabs-and-other-options-container"]}>
          <Box></Box>
          <PageSelector />
          <Box
            className={styles["save-btn-container"]}
            id="save-btn-container-portal"
          >
            <SaveButton
              allThemesArr={allThemesArr}
              themeSelectorState={themeSelectorState}
              survey={survey}
            />
          </Box>
        </Group>

        <Box
          className={
            styles["selected-page-tab-panels-and-styles-div-container"]
          }
        >
          <Box className={`${styles["theme-preview-container"]}`}>
            <PreviewDeviceButtons />
            <WelcomePageSwitch survey={survey} />
            <SurveyThemePreviewLayout survey={survey} />
          </Box>

          <Box
            className={`${styles["theme-selector-org-logo-styles-component-container"]}`}
          >
            <ThemeSelector
              className={styles["theme-selector-div"]}
              allThemesArr={allThemesArr}
              themeSelectorState={themeSelectorState}
              setThemeSelectorState={setThemeSelectorState}
              isAllThemesFetchPending={isAllThemesFetchPending}
              survey={survey}
            />
            <Box className={styles["styles-component-container"]}>
              <StylesComponent survey={survey} />
            </Box>
          </Box>
        </Box>
      </Box>
    </SurveyThemeContextProvider>
  );
}

export default SurveyTheme;
