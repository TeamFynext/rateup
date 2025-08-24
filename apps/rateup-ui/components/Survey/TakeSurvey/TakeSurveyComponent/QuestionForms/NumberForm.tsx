import { KeyboardEventHandler, useContext } from "react";

import { NumberInput, useMantineTheme } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";
import { handleInputScrollIntoView } from "../util";
import FormPaperLayout from "./layout/FormPaperLayout";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  const translations = useTranslations();
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
