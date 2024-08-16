import { Box, Center } from "@mantine/core";
import classNames from "classnames/bind";

import useTranslations from "@/dictionaries/useTranslation";

import PreviewDeviceButtons from "./components/PreviewDeviceButtons";
import styles from "./SurveyTheme.module.css";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";

const cx = classNames.bind(styles);

function SurveyTheme({
  survey,
  previewId,
  isSurveyThemeEditView = false,
  isSurveyThemePreview = false,
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
      <Box
        className={`${cx("selected-page-tab-panels-and-styles-div-container")} selected-page-tab-panels-and-styles-div-container`}
      >
        <Box
          className={`${cx("theme-preview-container")} theme-preview-container`}
        >
          <PreviewDeviceButtons />
          <SurveyThemePreviewLayout
            survey={survey}
            previewId={previewId}
            isSurveyThemeEditView={isSurveyThemeEditView}
            isSurveyThemePreview={isSurveyThemePreview}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default SurveyTheme;
