import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Input, Paper } from "@mantine/core";
import classes from "../TakeSurvey.module.css";

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
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
      />
    </Paper>
  );
}
