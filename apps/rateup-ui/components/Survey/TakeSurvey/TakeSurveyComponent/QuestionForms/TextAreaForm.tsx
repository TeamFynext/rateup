import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";
import { ContainedTextArea } from "../../../../input/ContainedInput/ContainedInput";

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
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
        placeholder="Enter your answer"
        value={inputValue}
        onChange={handleChange}
        variant="unstyled"
        size="sm"
        classNames={{
          input: classes.input,
        }}
        p={0}
      />
    </FormPaperLayout>
  );
}
