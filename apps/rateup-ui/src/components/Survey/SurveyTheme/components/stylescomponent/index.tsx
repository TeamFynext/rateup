import { IconInfoCircle } from "@tabler/icons-react";
import { produce } from "immer";
import { difference } from "lodash";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldTitle } from "@/components/ui/field.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";

import { getSurveyThemeKeyOf, supportedPageEditors } from "../../SurveyTheme.constants";
import { ThemeTabEnum } from "../../SurveyTheme.enums";
import {
  useOpenEditors,
  useSelectedPageTab,
  useSetOpenEditors,
} from "../../SurveyThemeContext.tsx";
import PageThemeSaveBtn from "../PageThemeSaveButton/indext.tsx";
import SaveButton from "../SaveButton/index.tsx";
import ThemeSelector from "../ThemeSelector/index.tsx";

function StylesComponent({
  survey,
  isThemeObjBeingEditedDefaultTheme,
  themeObjBeingEdited,
  onClose,
  allThemesArr,
  themeSelectorState,
  setThemeSelectorState,
  isAllThemesFetchPending,
  onSave = onClose,
}: {
  survey: Survey;
  isThemeObjBeingEditedDefaultTheme?: boolean;
  themeObjBeingEdited?: { id: string; name: string } | null;
  onClose: () => void;
  allThemesArr?: Array<{ id: string; name: string }>;
  themeSelectorState: string | undefined;
  setThemeSelectorState: (id: string) => void;
  isAllThemesFetchPending?: boolean;
  onSave?: () => void;
}) {
  const { t: translations } = useTranslation();
  const selectedPageTab = useSelectedPageTab();
  const openEditors = useOpenEditors();
  const setOpenEditors = useSetOpenEditors();

  // The tab is always one of the four the helper maps.
  const surveyThemeKey = getSurveyThemeKeyOf(selectedPageTab)!;
  const isSurveyPageTab = selectedPageTab === "surveyPage";
  const selectedPageUseSurveyThemeValue =
    survey?.webSurveyPagesTheme?.[surveyThemeKey]?.["useSurveyTheme"];
  const shouldUseSurveyTheme = selectedPageUseSurveyThemeValue && !isSurveyPageTab;

  const editorComponents =
    supportedPageEditors[selectedPageTab as keyof typeof supportedPageEditors];
  const shouldDisplayThemeSelector = selectedPageTab === ThemeTabEnum.SURVEY;

  const surveyUpdateMutation = useSurveyUpdateMutation(survey?.id);

  const handleUseSurveyThemeCheckboxChange = useCallback(
    async (checked: boolean) => {
      const webSurveyPagesTheme = survey?.webSurveyPagesTheme;
      const newWebSurveyPagesTheme = produce(
        webSurveyPagesTheme,
        (draft: typeof webSurveyPagesTheme) => {
          draft[surveyThemeKey]!["useSurveyTheme"] = checked;
        },
      );

      await surveyUpdateMutation.mutateAsync({
        surveyId: survey?.id,
        data: { webSurveyPagesTheme: newWebSurveyPagesTheme },
      });
    },
    [survey],
  );

  return (
    <div className="flex h-full flex-col gap-[0.875rem]">
      {shouldDisplayThemeSelector && (
        <>
          <ThemeSelector
            className="flex flex-col flex-wrap justify-start gap-[0.625rem] p-[0.875rem] pb-0"
            allThemesArr={allThemesArr}
            themeSelectorState={themeSelectorState}
            setThemeSelectorState={setThemeSelectorState}
            isAllThemesFetchPending={isAllThemesFetchPending}
            survey={survey}
          />

          {isThemeObjBeingEditedDefaultTheme && (
            <Alert className="mx-3.5 w-auto">
              <IconInfoCircle />
              <AlertDescription>
                {translations(
                  "The Default Theme can't be edited. Create a new theme to customise it.",
                )}
              </AlertDescription>
            </Alert>
          )}
          <Separator />
        </>
      )}

      {!isSurveyPageTab && (
        <>
          <Field className="px-[1.1875rem] pt-[0.875rem]">
            <FieldTitle className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={selectedPageUseSurveyThemeValue}
                onCheckedChange={handleUseSurveyThemeCheckboxChange}
              />
              Use Survey Theme
            </FieldTitle>
          </Field>
          <Separator />
        </>
      )}

      <ScrollArea className="flex flex-1 flex-col px-[0.875rem]">
        <div className="relative">
          <Accordion
            value={openEditors}
            onValueChange={(valuesArr) => {
              if (openEditors?.length === supportedPageEditors[selectedPageTab]?.length) {
                const editorsObjArr = supportedPageEditors[selectedPageTab];
                const allValues = editorsObjArr?.map(({ value }) => value);
                const diff = difference(allValues, valuesArr);
                setOpenEditors(diff);
                return;
              }
              const lastEleIndex = valuesArr.length - 1;
              if (lastEleIndex > 0) {
                setOpenEditors(valuesArr.splice(lastEleIndex, 1));
                return;
              }
              setOpenEditors(valuesArr);
            }}
          >
            {editorComponents?.map(({ id, Component, value, label }) => {
              if (Component) {
                return (
                  <AccordionItem key={selectedPageTab + id} value={value}>
                    <AccordionTrigger>{label}</AccordionTrigger>
                    <AccordionContent>
                      <Component />
                    </AccordionContent>
                  </AccordionItem>
                );
              }
            })}
          </Accordion>
        </div>
      </ScrollArea>

      <Separator />

      <div className="relative flex justify-center px-[0.875rem] pb-[0.875rem]">
        <div className="flex-[0_1_auto]">
          <Button
            onClick={onClose}
            variant="outline"
            className="h-auto w-full rounded-full px-4 py-2 text-xs leading-normal"
          >
            Close
          </Button>
        </div>

        {isSurveyPageTab && (
          <SaveButton
            className="w-auto"
            survey={survey}
            isThemeObjBeingEditedDefaultTheme={isThemeObjBeingEditedDefaultTheme}
            themeObjBeingEdited={themeObjBeingEdited}
            onSave={onSave}
          />
        )}

        {!isSurveyPageTab && (
          <PageThemeSaveBtn
            className="h-auto w-auto rounded-full px-4 py-2 text-xs leading-normal"
            disabled={shouldUseSurveyTheme}
            survey={survey}
          />
        )}
      </div>
    </div>
  );
}

export default StylesComponent;
