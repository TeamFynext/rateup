"use client";

import { Box, Button, Center } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { useExtracted } from "next-intl";

import { useNavControlContext } from "@/context/NavControlContext";

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

  const translations = useExtracted();

  const { navOpened, setNavOpened } = useNavControlContext();

  if (!surveyTheme)
    return (
      <Center h={"100%"}>
        <p>{translations("Unable to get theme, please try again later")}</p>
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

          {!isSurveyThemePreview && (
            <Button
              className={`${cx("edit-page-theme-btn", { "edit-preview-edit-page-theme-btn": isSurveyThemeEditView })}`}
              rightSection={<IconEdit size={16} />}
              onClick={() => {
                onEditPageBtnClick?.();
                setNavOpened(false);
              }}
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
