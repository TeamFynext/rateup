import { useContext, useState } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import { ContainedTextArea } from "../../../../input/ContainedInput/ContainedInput.tsx";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [inputValue, setInputValue] = useState(response || "");

  const handleChange = (e) => {
    const newValue = e.currentTarget.value;

    const updatedResponse = newValue?.replace(/\n+/g, ", ");
    updateResponse(updatedResponse);
    setInputValue(newValue);
  };

  return (
    <FormPaperLayout>
      <ContainedTextArea
        value={inputValue}
        onChange={handleChange}
        variant="unstyled"
        size="sm"
        classNames={{
          input: classes.input,
        }}
        p={0}
        onClick={handleInputScrollIntoView}
      />
    </FormPaperLayout>
  );
}
