import { KeyboardEventHandler, useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { NumberInput, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { handleInputScrollIntoView } from "../util";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  return (
    <FormPaperLayout>
      <NumberInput
        size="sm"
        placeholder="Enter number input"
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
