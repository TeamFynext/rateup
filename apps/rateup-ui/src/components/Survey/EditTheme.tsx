import { IconLanguage } from "@tabler/icons-react";
import { isEqual } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils";

import StylesComponent from "./SurveyTheme/components/stylescomponent/index.tsx";
import SurveyTheme from "./SurveyTheme/index.tsx";
import { ThemeTabEnum } from "./SurveyTheme/SurveyTheme.enums";
import { SurveyThemeContextProvider } from "./SurveyTheme/SurveyThemeContext.tsx";
import type { UnsavedChangesCheck } from "./Tabs/TabPanels.tsx";
import UiTextTranslationsModal from "./UiTextTranslationsModal/index.tsx";

interface EditThemeProps {
  survey: Survey;
  questions: Array<Question>;
  /** Leaves the Edit Theme tab (used by the panel's Close button). */
  onClose: () => void;
  setFunToRunBeforeSurveyIdPageHeaderTabsChange: React.Dispatch<
    React.SetStateAction<UnsavedChangesCheck | null>
  >;
}

/**
 * Survey-level theme editor. Lives as its own top-level tab: live preview on the
 * left, the theme controls panel permanently docked on the right.
 */
export function EditTheme({
  survey,
  questions,
  onClose,
  setFunToRunBeforeSurveyIdPageHeaderTabsChange,
}: Readonly<EditThemeProps>) {
  const [surveyThemeContextValue, setSurveyThemeContextValue] = useState(
    survey?.webSurveyTheme?.theme,
  );
  // selected surveyThemeId.
  const [themeSelectorState, setThemeSelectorState] = useState(survey?.webSurveyThemeId);
  const [isUiTextTranslationsModalOpen, setIsUiTextTranslationsModalOpen] = useState(false);

  // To store state of surveyThemeContextProvider.
  const surveyThemeContextProviderValueRef = useRef<HTMLElement | null>(null);

  // Remounts the preview when the question set changes. TakeSurvey (rendered deep
  // inside the preview) keeps its own state — selected question, answers, slide
  // direction — which would otherwise point at a deleted or reordered question.
  // Derived from the ids rather than a random key so theme edits, which flow
  // through context and must stay live, don't tear the preview down.
  const surveyPreviewCompKey = questions?.map((question) => question.id).join(",") ?? "";

  const { data: allThemesArr, isPending: isAllThemesFetchPending } = useAllThemes();

  const themeObjBeingEdited = allThemesArr?.find(
    (obj: { id: string }) => obj.id === themeSelectorState,
  );
  const isThemeObjBeingEditedDefaultTheme = themeObjBeingEdited?.name === "Default Theme";

  useEffect(() => {
    setSurveyThemeContextValue(survey?.webSurveyTheme?.theme);
    setThemeSelectorState(survey?.webSurveyThemeId);
  }, [survey]);

  const checkForUnsavedChanges = useCallback(
    () =>
      themeSelectorState !== survey?.webSurveyThemeId ||
      !isEqual(surveyThemeContextProviderValueRef.current, survey?.webSurveyTheme?.theme),
    [themeSelectorState, survey],
  );

  useEffect(() => {
    setFunToRunBeforeSurveyIdPageHeaderTabsChange(() => () => {
      if (checkForUnsavedChanges()) {
        return { haveUnsavedChanges: true, feedbackElement: "modal" };
      }
    });
    return () => {
      setFunToRunBeforeSurveyIdPageHeaderTabsChange(null);
    };
  }, [checkForUnsavedChanges, setFunToRunBeforeSurveyIdPageHeaderTabsChange]);

  return (
    <SurveyThemeContextProvider
      surveyTheme={surveyThemeContextValue}
      selectedPageTab={ThemeTabEnum.SURVEY}
      surveyThemeContextProviderValueRef={surveyThemeContextProviderValueRef}
    >
      <div
        className={cn(
          "flex h-full w-full overflow-hidden bg-muted",
          "[&_.survey-theme-root-div]:gap-2.5 [&_.survey-theme-root-div]:overflow-auto",
          "[&_.survey-theme-root-div_.selected-page-tab-panels-and-styles-div-container]:h-full",
          "[&_.survey-theme-root-div_.selected-page-tab-panels-and-styles-div-container]:flex-initial",
          "[&_.theme-preview-container]:w-full [&_.theme-preview-container]:flex-initial",
        )}
      >
        <div className="relative h-full min-w-0 flex-1 overflow-hidden">
          {survey && (
            <SurveyTheme
              previewId={"survey-theme-edit-preview"}
              key={surveyPreviewCompKey}
              survey={survey}
              isSurveyThemeEditView={true}
            />
          )}
          <Button
            aria-label="Change language"
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 z-[100] h-auto w-auto p-[5px]"
            onClick={() => setIsUiTextTranslationsModalOpen(!isUiTextTranslationsModalOpen)}
          >
            <IconLanguage size={20} />
          </Button>
        </div>

        <div className="h-full w-[340px] shrink-0 border-l">
          <Card className="h-full rounded-none border-0 p-0">
            <StylesComponent
              survey={survey}
              isThemeObjBeingEditedDefaultTheme={isThemeObjBeingEditedDefaultTheme}
              themeObjBeingEdited={themeObjBeingEdited}
              onClose={onClose}
              onSave={() => {}}
              allThemesArr={allThemesArr}
              themeSelectorState={themeSelectorState}
              setThemeSelectorState={setThemeSelectorState}
              isAllThemesFetchPending={isAllThemesFetchPending}
            />
          </Card>
        </div>

        <UiTextTranslationsModal
          survey={survey}
          opened={isUiTextTranslationsModalOpen}
          onClose={() => setIsUiTextTranslationsModalOpen(false)}
        />
      </div>
    </SurveyThemeContextProvider>
  );
}

export default EditTheme;
