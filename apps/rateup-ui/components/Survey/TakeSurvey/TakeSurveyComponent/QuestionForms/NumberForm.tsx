import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { NumberInput, Paper } from "@mantine/core";
import classes from "../TakeSurvey.module.css";

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
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
    </Paper>
  );
}
