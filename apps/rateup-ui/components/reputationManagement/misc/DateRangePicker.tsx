import { Button, Group, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import { DateRangePicker, Range } from "react-date-range";

import classes from "./InsideLabel.module.css";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { IconCalendar } from "@tabler/icons-react";

export function DateRangePickerButton({
  onChange,
  ranges,
}: {
  onChange: (range: Range) => void;
  ranges: Range[];
}) {
  const [opened, { open, close }] = useDisclosure(false);

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
          label="Start date"
          classNames={classes}
          leftSection={<IconCalendar size={"1rem"} />}
        />
        -
        <TextInput
          w="120px"
          value={ranges[0] ? dayjs(ranges[0].endDate).format("DD/MM/YYYY") : ""}
          onClick={open}
          readOnly
          label="End date"
          classNames={classes}
          leftSection={<IconCalendar size={"1rem"} />}
        />
      </Group>
      <Modal
        opened={opened}
        onClose={close}
        title="Date range picker"
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
          <Button
            onClick={() => onChange(undefined)}
            variant="outline"
            color="red"
          >
            Clear
          </Button>
        </Group>
      </Modal>
    </>
  );
}
