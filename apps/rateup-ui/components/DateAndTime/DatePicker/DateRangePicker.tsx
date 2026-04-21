"use client";

import { ActionIcon, Group, Modal, TextInput, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";
import { DateRangePicker, Range } from "react-date-range";

import { RateupButtonPrimary } from "@/components/Button/RateupButtons";

import classes from "./InsideLabel.module.css";

export function DateRangePickerButton({
  onChange,
  ranges,
}: {
  onChange: (range: Range) => void;
  ranges: Range[];
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const translations = useExtracted();
  return (
    <>
      <Group align="center">
        <TextInput
          value={
            ranges[0] ? dayjs(ranges[0].startDate).format("DD/MM/YYYY") : ""
          }
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
          <ActionIcon
            onClick={() => onChange(undefined)}
            variant="light"
            size={"xs"}
          >
            <IconX />
          </ActionIcon>
        </Tooltip>
      </Group>
      <DateRangePickerModal
        opened={opened}
        onChange={onChange}
        ranges={ranges}
        close={close}
      />
    </>
  );
}

export const DateRangePickerModal = ({ opened, onChange, ranges, close }) => {
  const translations = useExtracted();
  return (
    <Modal
      opened={opened}
      onClose={close}
      title={translations("Date range picker")}
      size={"auto"}
    >
      <DateRangePicker
        onChange={onChange}
        moveRangeOnFirstSelection={false}
        months={2}
        ranges={ranges}
        direction="horizontal"
      />
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
