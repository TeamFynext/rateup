"use client";

import React, { useRef } from "react";

import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  ColorInputProps,
  FileButton,
  FileButtonProps,
  FileInput,
  FileInputProps,
  JsonInput,
  JsonInputProps,
  MultiSelect,
  MultiSelectProps,
  NumberInput,
  NumberInputProps,
  PasswordInput,
  PasswordInputProps,
  rem,
  Select,
  SelectProps,
  Switch,
  SwitchProps,
  TagsInput,
  TagsInputProps,
  Text,
  Textarea,
  TextareaProps,
  TextInput,
  TextInputProps,
} from "@mantine/core";
import {
  DateFormatter,
  DateInput,
  DateInputProps,
  DatePickerInput,
  DatePickerInputProps,
  DateTimePicker,
  DateTimePickerProps,
  TimeInput,
  TimeInputProps,
} from "@mantine/dates";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";

import { LengthTracker } from "../LengthTracker";
import classes from "./ContainedInput.module.css";

export const ContainedTextField = React.forwardRef(function ContainedTextField(
  props: TextInputProps,
  ref?: React.Ref<HTMLInputElement>,
) {
  return (
    <TextInput
      ref={ref}
      classNames={classes}
      {...props}
      value={props.value ?? ""}
      styles={{
        input: {
          paddingRight: props.rightSection ? 70 : 0,
        },
        section: {
          width: props.rightSection && "fit-content",
        },
      }}
    />
  );
});
export const ContainedTextInputWithCounter = (props: TextInputProps) => {
  return (
    <TextInput
      classNames={classes}
      {...props}
      rightSection={
        props.max && (
          <LengthTracker
            length={
              typeof props.value === "string" || Array.isArray(props.value)
                ? props.value.length
                : 0
            }
            maxValue={props.max as number}
          />
        )
      }
      styles={{
        input: {
          paddingRight: props.max ? 70 : 0,
        },
        section: {
          width: props.max && "fit-content",
        },
      }}
    />
  );
};

export function ContainedTextArea(props: TextareaProps) {
  return (
    <Textarea
      classNames={classes}
      {...props}
      styles={{
        input: {
          paddingRight: props.rightSection ? 70 : 0,
        },
        section: {
          width: props.rightSection && "fit-content",
        },
      }}
    />
  );
}

export function ContainedSelection(props: SelectProps) {
  return (
    <Select
      comboboxProps={{ withinPortal: true }}
      classNames={classes}
      {...props}
    />
  );
}

export function ContainedPasswordInput(props: PasswordInputProps) {
  return <PasswordInput classNames={classes} {...props} />;
}

export function ContainedSwitchInput(props: SwitchProps) {
  return <Switch classNames={classes} {...props} />;
}
export const ContainedFileInput = React.forwardRef(function ContainedFileInput(
  props: FileInputProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return <FileInput ref={ref} classNames={classes} {...props} />;
});

export function ContainedNumberInput(props: NumberInputProps) {
  return <NumberInput classNames={classes} {...props} />;
}

export function ContainedColorInput(props: ColorInputProps) {
  return <ColorInput disallowInput classNames={classes} {...props} />;
}
interface fileButtonPropsExtend extends FileButtonProps {
  label: string;
  error?: string;
  helperText?: string;
}
export function ContainedFileButton(props: fileButtonPropsExtend) {
  const { label, error, helperText, ...restProps } = props;
  return (
    <Box mt={"xs"}>
      <FileButton {...restProps}>
        {(props) => <Button {...props}>{label}</Button>}
      </FileButton>
      {error ? (
        <Text c="var(--mantine-color-error)" fz="xs">
          {error}
        </Text>
      ) : (
        helperText && (
          <Text c="dimmed" fz="xs" mt={4}>
            {helperText}
          </Text>
        )
      )}
    </Box>
  );
}

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const getDayProps = (date) => ({
  style: {
    backgroundColor: date && isToday(new Date(date)) && "#73C2FB",
  },
});

export function ContainedDateTimePickerInput(props: DateTimePickerProps) {
  return (
    <DateTimePicker classNames={classes} getDayProps={getDayProps} {...props} />
  );
}

export function ContainedDateInput(props: DateInputProps) {
  return (
    <DateInput classNames={classes} getDayProps={getDayProps} {...props} />
  );
}
const formatter: DateFormatter = ({ type, date, locale, format }) => {
  if (!date) return null;

  if (type === "multiple" && Array.isArray(date)) {
    const dateCount = date.length;
    if (dateCount === 1) {
      return dayjs(date[0]).locale(locale).format(format);
    }
    return dateCount > 1 ? `${dateCount} dates selected` : "";
  }

  return Array.isArray(date)
    ? `${date.length} dates selected`
    : dayjs(date).locale(locale).format(format);
};
export function ContainedDatePickerInput(props: DatePickerInputProps) {
  return (
    <DatePickerInput
      classNames={classes}
      getDayProps={getDayProps}
      valueFormatter={formatter}
      {...props}
    />
  );
}

export function ContainedTimeInput(props: Readonly<TimeInputProps>) {
  const ref = useRef<HTMLInputElement>(null);
  const isChrome = navigator?.userAgent?.includes("Chrome") ?? false;
  const pickerControl = (
    <ActionIcon
      variant="subtle"
      color="gray"
      onClick={() => ref?.current?.showPicker()}
      disabled={props.disabled}
    >
      <IconClock style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
    </ActionIcon>
  );
  return (
    <TimeInput
      ref={ref}
      rightSection={isChrome && pickerControl}
      classNames={classes}
      {...props}
    />
  );
}
export function ContainedMultiSelect(props: MultiSelectProps) {
  const { styles, ...restProps } = props;
  return (
    <MultiSelect
      searchable
      hidePickedOptions
      classNames={classes}
      styles={{
        input: {
          borderRadius: "12px",
        },
        ...styles,
      }}
      {...restProps}
    />
  );
}

export function ContainedTagInput(props: TagsInputProps) {
  return (
    <TagsInput
      styles={{
        input: {
          borderRadius: "12px",
          minHeight: "45px",
        },
      }}
      {...props}
    />
  );
}

export function ContainedJsonInput(props: JsonInputProps) {
  return (
    <JsonInput
      classNames={classes}
      {...props}
      validationError="Invalid JSON"
      formatOnBlur
      autosize
      minRows={1.7}
      maxRows={4}
    />
  );
}
