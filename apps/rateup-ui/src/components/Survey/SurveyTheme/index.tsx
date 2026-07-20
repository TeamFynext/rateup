import { IconEdit } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { useNavControlContext } from "@/context/NavControlContext.ts";
import { cn } from "@/lib/utils.ts";

import PreviewDeviceButtons from "./components/PreviewDeviceButtons.tsx";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout.tsx";

import styles from "./SurveyTheme.module.css";

function SurveyTheme({
  survey,
  previewId,
  isSurveyThemeEditView = false,
  isSurveyThemePreview = false,
  onEditPageBtnClick = null,
}) {
  const { theme: surveyTheme } = survey?.webSurveyTheme ?? {};
  const { t: translations } = useTranslation();
  const { setNavOpened } = useNavControlContext();

  if (!surveyTheme)
    return (
      <div className="flex h-full items-center justify-center">
        <p>{translations("Unable to get theme, please try again later")}</p>
      </div>
    );

  return (
    <div className={cn(styles["survey-theme-root-div"], "survey-theme-root-div")}>
      <div
        className={cn(
          styles["selected-page-tab-panels-and-styles-div-container"],
          "selected-page-tab-panels-and-styles-div-container",
        )}
      >
        <div className={cn(styles["theme-preview-container"], "theme-preview-container")}>
          <PreviewDeviceButtons />

          {!isSurveyThemePreview && (
            <Button
              className={cn(
                styles["edit-page-theme-btn"],
                "edit-page-theme-btn",
                isSurveyThemeEditView && styles["edit-preview-edit-page-theme-btn"],
              )}
              onClick={() => {
                onEditPageBtnClick?.();
                setNavOpened(false);
              }}
            >
              Edit
              <IconEdit size={16} />
            </Button>
          )}

          <SurveyThemePreviewLayout
            survey={survey}
            previewId={previewId}
            isSurveyThemeEditView={isSurveyThemeEditView}
            isSurveyThemePreview={isSurveyThemePreview}
          />
        </div>
      </div>
    </div>
  );
}

export default SurveyTheme;
