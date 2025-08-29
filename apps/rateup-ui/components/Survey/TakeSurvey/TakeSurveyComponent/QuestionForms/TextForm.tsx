"use client";

import { useContext } from "react";

import { Input, useMantineTheme } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import FormPaperLayout from "./layout/FormPaperLayout";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  const translations = useTranslations();
  return (
    <FormPaperLayout>
      <Input
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        variant="unstyled"
        radius="xl"
        size="sm"
        classNames={{
          input: classes.input,
        }}
        onClick={handleInputScrollIntoView}
        style={{ maxWidth: "400px" }}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" && !isLastQuestion) {
            nextFn?.(e.currentTarget.value);
          }
        }}
      />
    </FormPaperLayout>
  );
}
