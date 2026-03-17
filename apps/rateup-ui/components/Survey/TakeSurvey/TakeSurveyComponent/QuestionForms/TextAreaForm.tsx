"use client";

import { useContext, useState } from "react";

import { useMantineTheme } from "@mantine/core";
import { useExtracted } from "next-intl";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { ContainedTextArea } from "../../../../input/ContainedInput/ContainedInput";
import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import FormPaperLayout from "./layout/FormPaperLayout";

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
  const translations = useExtracted();
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
