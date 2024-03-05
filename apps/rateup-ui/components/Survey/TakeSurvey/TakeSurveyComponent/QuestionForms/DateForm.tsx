import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { DateInput } from "@mantine/dates";
import { IconCalendarEvent } from "@tabler/icons-react";
import FormPaperLayout from "./layout/FormPaperLayout";

export function DateForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [value, setValue] = useState<Date | null>(null);
  const theme = useMantineTheme();
  return (
    <FormPaperLayout>
      <DateInput
        value={isPreview ? value : response}
        onChange={isPreview ? setValue : updateResponse}
        placeholder="Select date"
        maw={400}
        mx="auto"
        variant="unstyled"
        leftSection={
          <IconCalendarEvent
            size="1.2rem"
            color={`var(--mantine-color-${theme.primaryColor}-outline)`}
          />
        }
        classNames={{
          input: classes.input,
        }}
        styles={{
          calendarHeader: {
            color: `var(--mantine-color-${theme.primaryColor}-filled)`,
          },
          calendarHeaderControl: {
            color: `var(--mantine-color-${theme.primaryColor}-filled)`,
          },
        }}
      />
    </FormPaperLayout>
  );
}
