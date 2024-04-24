import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Input, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  return (
    <FormPaperLayout>
      <Input
        placeholder="Enter your answer"
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        variant="unstyled"
        radius="xl"
        size="sm"
        classNames={{
          input: classes.input,
        }}
        style={{ maxWidth: "400px" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLastQuestion) {
            nextFn?.();
          }
        }}
      />
    </FormPaperLayout>
  );
}
