import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateSurveyTheme } from "@/backend/surveyTheme/surveyTheme.query";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

import { ThemeTabEnum } from "../../SurveyTheme.enums";
import { destructureThemeAndUploadImagesIfAny } from "../../SurveyTheme.utils";
import { useSelectedPageTab, useSurveyThemeContextValue } from "../../SurveyThemeContext.tsx";

function SaveButton({
  className = "",
  survey,
  themeObjBeingEdited,
  isThemeObjBeingEditedDefaultTheme,
  onSave = null,
}) {
  const selectedPageTab = useSelectedPageTab();
  const themeObjState = useSurveyThemeContextValue();
  const [isSaving, setIsSaving] = useState(false);
  const { t: translations } = useTranslation();
  const updateSurveyTheme = useUpdateSurveyTheme(themeObjBeingEdited?.id, survey?.id);

  const handleSaveTheme = useCallback(async () => {
    if (!themeObjBeingEdited?.id) {
      toast.error("Please select a theme.", { id: "theme-not-selected-error" });
      return;
    }
    setIsSaving(true);
    const newSurveyTheme = await destructureThemeAndUploadImagesIfAny(themeObjState);
    await updateSurveyTheme.mutateAsync({
      surveyThemeId: themeObjBeingEdited?.id,
      body: { surveyId: survey?.id, theme: newSurveyTheme },
    });
    setIsSaving(false);
    onSave?.();
  }, [themeObjBeingEdited, themeObjState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveTheme();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveTheme]);

  return (
    <div className={cn("save-button-root-div flex w-full justify-center", className)}>
      <Button
        className="h-auto rounded-full px-4 py-2 text-xs leading-normal"
        disabled={isSaving}
        onClick={handleSaveTheme}
      >
        {isSaving && <Loader2 className="mr-1 size-3 animate-spin" />}
        {isThemeObjBeingEditedDefaultTheme
          ? translations("Apply")
          : selectedPageTab === ThemeTabEnum.SURVEY
            ? translations("Save & Apply")
            : translations("Save")}
      </Button>
    </div>
  );
}

export default SaveButton;
