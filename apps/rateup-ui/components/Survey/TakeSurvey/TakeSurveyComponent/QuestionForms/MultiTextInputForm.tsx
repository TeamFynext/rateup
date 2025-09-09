"use client";

import { useContext, useEffect } from "react";

import { Stack } from "@mantine/core";

import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import { CurrentResponsesContext } from "@/context/ResponseContext";
import SelectedLanguageContext from "@/context/SelectedLanguage";

import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import FormPaperLayout from "./layout/FormPaperLayout";

type CustomInputFields = {
  fieldKey: string;
  placeholderText: string;
};
const MultiTextInputForm = ({ features }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const fields: CustomInputFields[] = features?.[selectedLanguage]?.fields;

  useEffect(() => {
    if (
      response &&
      Object.values(response).every((r: string) => !r?.trim().length)
    )
      updateResponse(undefined);
  }, [response]);

  return (
    <Stack w={"100%"} gap={"xs"}>
      {fields?.map((field, index) => (
        <FormPaperLayout key={index}>
          <ContainedTextField
            placeholder={field.placeholderText}
            value={response?.[field.fieldKey] || ""}
            variant="unstyled"
            onChange={(e) => {
              updateResponse({
                ...response,
                [field.fieldKey]: e.currentTarget.value,
              });
            }}
            classNames={{
              input: classes.input,
            }}
            onClick={handleInputScrollIntoView}
          />
        </FormPaperLayout>
      ))}
    </Stack>
  );
};

export default MultiTextInputForm;
