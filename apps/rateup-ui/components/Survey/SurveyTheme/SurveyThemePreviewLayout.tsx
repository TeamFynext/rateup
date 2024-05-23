import { Box, Overlay, Stack, Tabs } from "@mantine/core";
import { PreviewTypeEnum, ThemeTabEnum } from "./SurveyTheme.enums";
import WelcomePageThemeView from "./components/previewcomponents/welcomepage";
import SurveyThemeView from "./components/previewcomponents/surveytheme";
import ThankyouPageThemeView from "./components/previewcomponents/thankyoupage";
import { useSelectedPageTab, useSelectedPreview } from "./SurveyThemeContext";
import styles from "./SurveyTheme.module.css";

function SurveyThemePreviewLayout({ survey }) {
  const selectedPageTab = useSelectedPageTab();
  const selectedPreview = useSelectedPreview();

  return (
    <Stack h="100%" w={"100%"} p={"0.4375rem"}>
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
          >
            <Tabs.Panel value={ThemeTabEnum.WELCOME}>
              <WelcomePageThemeView survey={survey} />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.SURVEY}>
              <SurveyThemeView />
            </Tabs.Panel>
            <Tabs.Panel value={ThemeTabEnum.THANKYOU}>
              <ThankyouPageThemeView />
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Box>
    </Stack>
  );
}

export default SurveyThemePreviewLayout;
