import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Paper, Textarea } from "@mantine/core";
import classes from "../TakeSurvey.module.css";

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Textarea
        placeholder="Enter your answer"
        value={response?.length > 0 ? response?.replace(", ", "\n") : ""}
        onChange={(e) => {
          const replacedValue = e.currentTarget.value.replace(/\n/g, ", ");
          updateResponse(replacedValue);
        }}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        size="sm"
        classNames={{
          input: classes.input,
        }}
      />
    </Paper>
  );
}
