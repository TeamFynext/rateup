import { Button } from "@mantine/core";
import { useCallback, useState } from "react";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";

import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import { useSurveyThemeContextValue } from "../../SurveyThemeContext.tsx";

function PageThemeSaveBtn({ className = "", disabled = false, survey }) {
  const [isSaving, setIsSaving] = useState(false);
  const surveyUpdateMutation = useSurveyUpdateMutation(survey?.id);

  const themeObjState = useSurveyThemeContextValue();

  const handlePageThemeSave = useCallback(async () => {
    const newWebSurveyPagesTheme = await destructureThemeAndUploadImagesIfAny(themeObjState);
    setIsSaving(true);
    await surveyUpdateMutation.mutateAsync({
      surveyId: survey?.id,
      data: {
        webSurveyPagesTheme: newWebSurveyPagesTheme,
      },
    });
    setIsSaving(false);
  }, [themeObjState]);

  return (
    <Button
      className={className}
      onClick={handlePageThemeSave}
      disabled={disabled}
      loading={isSaving}
    >
      Save
    </Button>
  );
}

export default PageThemeSaveBtn;
