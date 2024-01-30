import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { NumberInput, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  return (
    <FormPaperLayout>
      <NumberInput
        size="sm"
        placeholder="Enter number input"
        value={parseInt(response) || null}
        onChange={(value) => updateResponse(value)}
        variant="unstyled"
        classNames={{
          input: classes.input,
        }}
      />
    </FormPaperLayout>
  );
}
