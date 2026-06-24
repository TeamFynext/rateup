import { Input } from "@mantine/core";
import { useContext } from "react";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

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
