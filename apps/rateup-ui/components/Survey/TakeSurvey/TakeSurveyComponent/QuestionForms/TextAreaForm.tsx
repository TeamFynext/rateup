import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Textarea, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const [inputValue, setInputValue] = useState(response || "");

  const handleChange = (e) => {
    const newValue = e.currentTarget.value;

    const updatedResponse = newValue?.replace(/\n/g, ", ");
    updateResponse(updatedResponse);
    setInputValue(newValue);
  };

  return (
    <FormPaperLayout>
      <Textarea
        placeholder="Enter your answer"
        value={inputValue}
        onChange={handleChange}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        size="sm"
        classNames={{
          input: classes.input,
        }}
      />
    </FormPaperLayout>
  );
}
