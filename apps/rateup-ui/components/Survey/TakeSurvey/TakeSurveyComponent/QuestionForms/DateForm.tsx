import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendarEvent } from "@tabler/icons-react";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useOs } from "@mantine/hooks";
import { tree } from "next/dist/build/templates/app-page";

export function DateForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [value, setValue] = useState<Date | null>(null);
  const theme = useMantineTheme();

  const os = useOs();
  const isMobile = os === "android" || os === "ios";

  return (
    <FormPaperLayout>
      <DatePickerInput
        value={isPreview ? value : response}
        onChange={isPreview ? setValue : updateResponse}
        placeholder="Select date"
        defaultLevel="decade"
        maw={400}
        mx="auto"
        dropdownType={isMobile ? "modal" : "popover"}
        modalProps={{
          centered: true,
        }}
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
