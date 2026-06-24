"use client";

import { useContext } from "react";

import { Input, useMantineTheme } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  const { t: translations } = useTranslation();
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
