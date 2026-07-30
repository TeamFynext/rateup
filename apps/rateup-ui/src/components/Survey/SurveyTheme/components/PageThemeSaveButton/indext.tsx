import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";

import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import { useSurveyThemeContextValue } from "../../SurveyThemeContext.tsx";

function PageThemeSaveBtn({
  className = "",
  disabled = false,
  survey,
}: {
  className?: string;
  disabled?: boolean;
  survey: Survey;
}) {
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
    <Button className={className} onClick={handlePageThemeSave} disabled={disabled || isSaving}>
      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save
    </Button>
  );
}

export default PageThemeSaveBtn;
