import { useCallback, useState } from "react";

import { ActionIcon, Box, Button, Center } from "@mantine/core";
import { IconEdit, IconLanguage } from "@tabler/icons-react";
import classNames from "classnames/bind";

import useTranslations from "@/dictionaries/useTranslation";

import UiTextTranslationsModal from "../UiTextTranslationsModal";
import PreviewDeviceButtons from "./components/PreviewDeviceButtons";
import styles from "./SurveyTheme.module.css";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";

const cx = classNames.bind(styles);

function SurveyTheme({
  survey,
  previewId,
  isSurveyThemeEditView = false,
  isSurveyThemePreview = false,
  onEditPageBtnClick = null,
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

          {!isSurveyThemeEditView && !isSurveyThemePreview && (
            <Button
              className={styles["edit-page-theme-btn"]}
              rightSection={<IconEdit size={16} />}
              onClick={onEditPageBtnClick}
            >
              Edit
            </Button>
          )}

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
