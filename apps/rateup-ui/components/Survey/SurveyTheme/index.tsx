"use client";

import { IconEdit } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useNavControlContext } from "@/context/NavControlContext";

import PreviewDeviceButtons from "./components/PreviewDeviceButtons";
import SurveyThemePreviewLayout from "./SurveyThemePreviewLayout";

function SurveyTheme({
  survey,
  previewId,
  isSurveyThemeEditView = false,
  isSurveyThemePreview = false,
  onEditPageBtnClick = null,
}) {
  const { theme: surveyTheme } = survey?.webSurveyTheme;

  const translations = useTranslations();

  const { navOpened, setNavOpened } = useNavControlContext();

  if (!surveyTheme)
    return (
      <div className="flex justify-center items-center h-full">
        <p>{translations("Unable to get theme, please try again later")}</p>
      </div>
    );

  return (
    <div className="h-full w-full">
      <div className="h-full w-full relative">
        <div
          className={`flex items-center justify-between absolute z-50 w-full p-3`}
        >
          <PreviewDeviceButtons />

          {!isSurveyThemePreview && (
            <Button
              onClick={() => {
                onEditPageBtnClick?.();
                setNavOpened(false);
              }}
              className="flex items-center justify-center gap-1"
            >
              <IconEdit size={16} />
              Edit
            </Button>
          )}
        </div>

        <SurveyThemePreviewLayout
          survey={survey}
          previewId={previewId}
          isSurveyThemeEditView={isSurveyThemeEditView}
          isSurveyThemePreview={isSurveyThemePreview}
        />
      </div>
    </div>
  );
}

export default SurveyTheme;
