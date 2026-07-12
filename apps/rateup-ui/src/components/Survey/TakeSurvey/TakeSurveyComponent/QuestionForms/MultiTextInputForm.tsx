import { useContext, useEffect } from "react";

import { Input } from "@/components/ui/input.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

interface CustomInputFields {
  fieldKey: string;
  placeholderText: string;
}
const MultiTextInputForm = ({ features }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const fields: CustomInputFields[] = features?.[selectedLanguage]?.fields;

  useEffect(() => {
    if (response && Object.values(response).every((r: string) => !r?.trim().length))
      updateResponse(undefined);
  }, [response]);

  return (
    <div className="flex w-full flex-col gap-2.5">
      {fields?.map((field, index) => (
        <FormPaperLayout key={index}>
          <Input
            placeholder={field.placeholderText}
            value={response?.[field.fieldKey] || ""}
            onChange={(e) => {
              updateResponse({
                ...response,
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
