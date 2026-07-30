import { IconArrowRight } from "@tabler/icons-react";
import { produce } from "immer";
import { useCallback } from "react";

import { useSurveyUpdateMutation } from "@/backend/surveys/surveys.query";
import AutosaveInput from "@/components/input/AutosaveInput/index.tsx";

function EditTranslations({
  survey,
  element,
  uiTextTranslations,
  languages,
}: {
  survey: Survey;
  element: string;
  uiTextTranslations: Record<string, Record<string, string>>;
  languages: string[];
}) {
  const { name, label } = element;

  const translatedValues = uiTextTranslations?.[name] || {};

  const surveyUpdateMutation = useSurveyUpdateMutation(survey?.id);

  const handleSave = useCallback(
    async (value: string, language: string) => {
      const newUiTextTranslationsObj = produce(uiTextTranslations, (draft) => {
        if (!draft[name]) {
          draft[name] = {};
        }
        draft[name][language.toLowerCase()] = value;
      });
      await surveyUpdateMutation.mutateAsync({
        surveyId: survey.id,
        data: {
          uiTextTranslations: newUiTextTranslationsObj,
        },
      });
    },
    [uiTextTranslations, name, survey],
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xl">{label}</h2>
      <div className="flex flex-col gap-2">
        {languages.map((language) => {
          const value = translatedValues[language.toLowerCase()];
          return (
            <div key={language} className="grid grid-cols-[4fr_1fr_4fr] items-center gap-2">
              <p>{language}</p>
              <IconArrowRight className="justify-self-center" />
              <AutosaveInput name={language} value={value} onSave={handleSave} showToasts={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EditTranslations;
