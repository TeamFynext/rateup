"use client";

import { Box, Stack, Tabs } from "@mantine/core";

import LanguagePageThemeView from "./components/previewcomponents/languagePage/index.tsx";
import SurveyThemeView from "./components/previewcomponents/surveytheme/index.tsx";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage/index.tsx";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage/index.tsx";
import { PreviewTypeEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import styles from "./SurveyTheme.module.css";
import {
  useSelectedPageTab,
  useSelectedPreview,
} from "./SurveyThemeContext.tsx";

function SurveyThemePreviewLayout({
  survey,
  previewId,
  isSurveyThemeEditView,
  isSurveyThemePreview,
}) {
  let selectedPageTab = useSelectedPageTab();
  const selectedPreview = useSelectedPreview();

  if (isSurveyThemePreview) {
    selectedPageTab = ThemeTabEnum.SURVEY;
  }

  return (
    <Stack
      className={`${styles["survey-theme-preview-layout-div"]} survey-theme-preview-layout-div`}
    >
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
        }}
        h={"100%"}
      >
        <Box
          h={"100%"}
          w={selectedPreview === PreviewTypeEnum.MOBILE ? 380 : "100%"}
        >
          <Tabs
            value={selectedPageTab}
            classNames={{
              root: styles["survey-theme-preview-tab-panels-root"],
            }}
            keepMounted={false}
          >
            <Tabs.Panel value={ThemeTabEnum.LANGUAGE}>
              <LanguagePageThemeView survey={survey} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.WELCOME}>
              <WelcomePageThemeView survey={survey} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.SURVEY}>
              <SurveyThemeView
                previewId={previewId}
                survey={survey}
                isSurveyThemeEditView={isSurveyThemeEditView}
              />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.THANKYOU}>
              <ThankyouPageThemeView survey={survey} />
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Box>
    </Stack>
  );
}

export default SurveyThemePreviewLayout;
