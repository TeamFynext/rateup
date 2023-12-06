import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Paper, Stack, TextInput } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { IconMail } from "@tabler/icons-react";

export function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Stack>
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter email address"
          value={response || ""}
          onChange={(e) => updateResponse(e.currentTarget.value)}
          style={{ maxWidth: "400px" }}
          leftSection={<IconMail size="1.2rem" color="gray" />}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </Paper>
    </Stack>
  );
}
