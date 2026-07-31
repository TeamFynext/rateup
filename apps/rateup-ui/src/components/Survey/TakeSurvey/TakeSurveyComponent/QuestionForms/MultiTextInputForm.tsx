import { useContext, useEffect } from "react";

import type {
  QuestionFormFeatures,
  QuestionFormField,
} from "@/components/Survey/Question/QuestionExtraProps/questionForm.ts";
import { Input } from "@/components/ui/input.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { asAnswer } from "@/utils/response.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

const MultiTextInputForm = ({ features }: { features?: Record<string, QuestionFormFeatures> }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const fields: QuestionFormField[] = features?.[selectedLanguage]?.fields ?? [];

  useEffect(() => {
    // Every field of this question's response is a text input's value.
    if (response && Object.values(response).every((r) => !(r as string)?.trim().length))
      updateResponse(undefined);
  }, [response]);

  return (
    <div className="flex w-full flex-col gap-2.5">
      {fields?.map((field, index) => (
        <FormPaperLayout key={index}>
          <Input
            placeholder={field.placeholderText}
            value={String(asAnswer(response)[field.fieldKey] ?? "")}
            onChange={(e) => {
              updateResponse({
                ...asAnswer(response),
                [field.fieldKey]: e.target.value,
              });
            }}
            className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      ))}
    </div>
  );
};

export default MultiTextInputForm;
