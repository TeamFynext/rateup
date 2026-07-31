import { useContext, useState } from "react";
import type { ChangeEvent } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { asAnswerText } from "@/utils/response.ts";

import { Textarea } from "../../../../ui/textarea.tsx";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [inputValue, setInputValue] = useState(asAnswerText(response));

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;

    const updatedResponse = newValue?.replace(/\n+/g, ", ");
    updateResponse(updatedResponse);
    setInputValue(newValue);
  };

  return (
    <FormPaperLayout>
      <Textarea
        value={inputValue}
        onChange={handleChange}
        onClick={handleInputScrollIntoView}
        className={`resize-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 ${classes.input}`}
      />
    </FormPaperLayout>
  );
}
