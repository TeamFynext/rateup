import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Paper } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { DateInput } from "@mantine/dates";
import { IconCalendarEvent } from "@tabler/icons-react";

export function DateForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [value, setValue] = useState<Date | null>(null);
  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <DateInput
        value={isPreview ? value : response}
        onChange={isPreview ? setValue : updateResponse}
        placeholder="Select date"
        maw={400}
        mx="auto"
        variant="unstyled"
        leftSection={<IconCalendarEvent size="1.2rem" color="black" />}
        classNames={{
          input: classes.input,
        }}
      />
    </Paper>
  );
}
