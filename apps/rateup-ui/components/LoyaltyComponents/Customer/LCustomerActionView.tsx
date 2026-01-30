import { ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar } from "@tabler/icons-react";

import { DateRangePickerModal } from "@/components/DateAndTime/DatePicker/DateRangePicker";

export const CalenderIconDateRangePicker = ({
  ranges,
  setRange,
  label = "Filter by Date",
  variant = "light",
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Tooltip label={label}>
        <ActionIcon onClick={open} variant={variant}>
          <IconCalendar />
        </ActionIcon>
      </Tooltip>
      <DateRangePickerModal
        opened={opened}
        ranges={ranges}
        close={close}
        onChange={(r) => setRange(r ? [r["selection"]] : [])}
      />
    </>
  );
};
