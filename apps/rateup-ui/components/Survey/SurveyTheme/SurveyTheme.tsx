import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import StyledTabs from "../../styled/StyledTabs/StyledTabs";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage";
import StylesComponent from "./components/stylescomponent";
import SurveyThemeView from "./components/previewcomponents/surveytheme";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";
import SurveyThemeContextProvider from "./SurveyThemeContext";
import {
  Stack,
  Flex,
  Switch,
  Group,
  Tabs,
  Box,
  Button,
  Overlay,
} from "@mantine/core";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useSurveyTheme } from "../../../backend/surveyTheme/surveyTheme.query";
import {
  PreviewTypeEnum,
  SelectedItemEnum,
  ThemeTabEnum,
} from "./SurveyTheme.enums";
import styles from "./SurveyTheme.module.css";
import RateupLoader from "../../Loaders/RateupLoader";
import PreviewDeviceSelector from "./components/PreviewDeviceSelector";
import PageSelector from "./components/PageSelector";

function SurveyTheme({ survey }) {
  const [selectedPreview, setSelectedPreview] = useState(
    PreviewTypeEnum.DESKTOP,
  );
  const [selectedPageTab, setSelectedPageTab] = useState(ThemeTabEnum.SURVEY);

  const [selectedType, setSelectedType] = useState<SelectedItemEnum>(
    SelectedItemEnum.BACKGROUND,
  );

  const { data: surveyTheme, isLoading } = useSurveyTheme(survey?.id);

  const editSurvey = useEditSurveyMutation(survey?.id);
  const isWelcomePageEnabled = survey?.welcomePageEnabled;
  const handleWelcomePageSwitchChange = (e) => {
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };

  function availableThemeStyleComponents(): Array<SelectedItemEnum> {
    const common = [SelectedItemEnum.BACKGROUND, SelectedItemEnum.TITLE];
    switch (selectedPageTab) {
      case ThemeTabEnum.WELCOME:
        return [
          ...common,
          SelectedItemEnum.SUBTITLE,
          SelectedItemEnum.LOGO,
          SelectedItemEnum.BUTTON,
        ];
      case ThemeTabEnum.SURVEY:
        return [...common, SelectedItemEnum.BUTTON, SelectedItemEnum.INPUT];
      case ThemeTabEnum.THANKYOU:
        return [...common, SelectedItemEnum.SUBTITLE, SelectedItemEnum.LOGO];
      default:
        return [];
    }
  }

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyTheme}
      mobileOrDesktop={selectedPreview}
      setMobileOrDesktop={setSelectedPreview}
    >
      <Box className={styles["survey-theme-root-div"]}>
        <Group className={styles["tabs-and-other-options-container"]}>
          <PreviewDeviceSelector
            value={selectedPreview}
            onChange={setSelectedPreview}
          />
          <PageSelector onChange={setSelectedPageTab} value={selectedPageTab} />
          <Box
            className={styles["save-btn-container"]}
            id="save-btn-container-portal"
          >
            {/* save button from styles component will be rendered here */}
          </Box>
        </Group>

        <Box
          className={
            styles["selected-page-tab-panels-and-styles-div-container"]
          }
        >
          <Box className={styles["theme-preview-container"]}>
            <SurveyThemePreviewLayout
              isLoading={isLoading}
              survey={survey}
              themeType={selectedPageTab}
              mobileOrDesktop={selectedPreview}
            >
              <Tabs
                value={selectedPageTab}
                classNames={{
                  root: styles["survey-theme-preview-tab-panels-root"],
                }}
              >
                <Tabs.Panel value={ThemeTabEnum.WELCOME}>
                  <WelcomePageThemeView
                    {...{ selectedType, setSelectedType }}
                  />
                  {!isWelcomePageEnabled && <Overlay color="#FFFFFF" />}
                </Tabs.Panel>
                <Tabs.Panel value={ThemeTabEnum.SURVEY}>
                  <SurveyThemeView {...{ selectedType, setSelectedType }} />
                </Tabs.Panel>
                <Tabs.Panel value={ThemeTabEnum.THANKYOU}>
                  <ThankyouPageThemeView
                    {...{ selectedType, setSelectedType }}
                  />
                </Tabs.Panel>
              </Tabs>
            </SurveyThemePreviewLayout>
            {selectedPageTab === ThemeTabEnum.WELCOME && (
              <Box className={styles["welcome-page-switch-container"]}>
                <Switch
                  className={styles["welcome-page-switch"]}
                  classNames={{
                    track: `${
                      isWelcomePageEnabled
                        ? styles["switched-on-track"]
                        : styles["switched-off-track"]
                    }`,
                    body: styles["switch-body"],
                  }}
                  size="md"
                  label={`${isWelcomePageEnabled ? "Enabled " : "Disabled "}`}
                  checked={isWelcomePageEnabled}
                  onChange={handleWelcomePageSwitchChange}
                  labelPosition="left"
                />
              </Box>
            )}
          </Box>

          <Box className={styles["styles-component-container"]}>
            {selectedPageTab === ThemeTabEnum.WELCOME &&
              !isWelcomePageEnabled && <Overlay color="#FFFFFF" />}
            <StylesComponent
              selectedType={
                selectedType ? selectedType : SelectedItemEnum.BACKGROUND
              }
              availableStyleComponents={availableThemeStyleComponents()}
              setSelectedTab={setSelectedPageTab}
              selectedTab={selectedPageTab}
              survey={survey}
            />
          </Box>
        </Box>
      </Box>
    </SurveyThemeContextProvider>
  );
}

export default SurveyTheme;
