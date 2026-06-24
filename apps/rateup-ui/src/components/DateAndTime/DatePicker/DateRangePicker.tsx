import { ActionIcon, Group, Modal, TextInput, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { lazy, Suspense } from "react";
import type { Range } from "react-date-range";
import { useTranslation } from "react-i18next";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";

import classes from "./InsideLabel.module.css";

const DateRangePicker = lazy(() =>
  import("react-date-range").then((m) => ({ default: m.DateRangePicker })),
);

function DateRangePickerButton({
  onChange,
  ranges,
}: {
  onChange: (range: Range) => void;
  ranges: Range[];
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { t: translations } = useTranslation();
  return (
    <>
      <Group align="center">
        <TextInput
          value={ranges[0] ? dayjs(ranges[0].startDate).format("DD/MM/YYYY") : ""}
          onClick={open}
          readOnly
          w="120px"
          label={translations("Start date")}
          classNames={classes}
          leftSection={<IconCalendar size={"1rem"} />}
        />
        -
        <TextInput
          w="120px"
          value={ranges[0] ? dayjs(ranges[0].endDate).format("DD/MM/YYYY") : ""}
          onClick={open}
          readOnly
          label={translations("End date")}
          classNames={classes}
          leftSection={<IconCalendar size={"1rem"} />}
        />
        <Tooltip label={translations("Clear Date Filter")}>
          <ActionIcon onClick={() => onChange(undefined)} variant="light" size={"xs"}>
            <IconX />
          </ActionIcon>
        </Tooltip>
      </Group>
      <DateRangePickerModal opened={opened} onChange={onChange} ranges={ranges} close={close} />
    </>
  );
}

export const DateRangePickerModal = ({ opened, onChange, ranges, close }) => {
  const { t: translations } = useTranslation();
  return (
    <Modal opened={opened} onClose={close} title={translations("Date range picker")} size={"auto"}>
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-muted-foreground">Loading calendar...</div>
        }
      >
        <DateRangePicker
          onChange={onChange}
          moveRangeOnFirstSelection={false}
          months={2}
          ranges={ranges}
          direction="horizontal"
        />
      </Suspense>
      <Group justify="end">
        <RateupButtonPrimary
          onClick={() => onChange(undefined)}
          variant="outline"
          color="red"
          title={translations("Clear")}
        />
        <RateupButtonPrimary onClick={close} title={translations("Done")} />
      </Group>
    </Modal>
  );
};
