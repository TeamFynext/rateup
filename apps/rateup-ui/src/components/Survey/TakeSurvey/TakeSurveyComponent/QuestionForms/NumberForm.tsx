"use client";

import { useContext } from "react";

import { NumberInput, useMantineTheme } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  const { t: translations } = useTranslation();
  return (
    <FormPaperLayout>
      <NumberInput
        size="sm"
        value={parseInt(response) === 0 ? 0 : parseInt(response) || null}
        onChange={(value) => updateResponse(value)}
        variant="unstyled"
        classNames={{
          input: classes.input,
        }}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" && !isLastQuestion) {
            nextFn?.(e.target.value);
          }
        }}
        onClick={handleInputScrollIntoView}
      />
    </FormPaperLayout>
  );
}
