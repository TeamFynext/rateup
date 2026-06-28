import type {
  ColorInputProps,
  FileButtonProps,
  FileInputProps,
  JsonInputProps,
  MultiSelectProps,
  NumberInputProps,
  PasswordInputProps,
  SelectProps,
  TagsInputProps,
  TextareaProps,
  TextInputProps,
} from "@mantine/core";
import {
  Box,
  Button,
  ColorInput,
  FileButton,
  FileInput,
  JsonInput,
  MultiSelect,
  NumberInput,
  PasswordInput,
  Select,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { DateFormatter, DatePickerInputProps, DateTimePickerProps } from "@mantine/dates";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import React from "react";

import { LengthTracker } from "../LengthTracker.tsx";

import classes from "./ContainedInput.module.css";

/** @deprecated Use `TextInput` from "@component/ui/input" */
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
/** @deprecated Use `TextInput` from "@component/ui/input" */
export const ContainedTextInputWithCounter = (props: TextInputProps) => {
  return (
    <TextInput
      classNames={classes}
      {...props}
      rightSection={
        props.max && (
          <LengthTracker
            length={
              typeof props.value === "string" || Array.isArray(props.value) ? props.value.length : 0
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

/** @deprecated Use `Textarea` from "@component/ui/input" */
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

/** @deprecated Use `Select` from "@component/ui/input" */
export function ContainedSelection(props: SelectProps) {
  return <Select comboboxProps={{ withinPortal: true }} classNames={classes} {...props} />;
}

/** @deprecated Use `PasswordInput` from "@component/ui/input" */
export function ContainedPasswordInput(props: PasswordInputProps) {
  return <PasswordInput classNames={classes} {...props} />;
}

/** @deprecated Use `FileInput` from "@component/ui/input" */
export const ContainedFileInput = React.forwardRef(function ContainedFileInput(
  props: FileInputProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return <FileInput ref={ref} classNames={classes} {...props} />;
});

/** @deprecated Use `NumberInput` from "@component/ui/input" */
export function ContainedNumberInput(props: NumberInputProps) {
  return <NumberInput classNames={classes} {...props} />;
}

/** @deprecated Use `ColorInput` from "@component/ui/input" */
export function ContainedColorInput(props: ColorInputProps) {
  return <ColorInput disallowInput classNames={classes} {...props} />;
}
interface fileButtonPropsExtend extends FileButtonProps {
  label: string;
  error?: string;
  helperText?: string;
}
/** @deprecated Use `FileButton` from "@component/ui/input" */
export function ContainedFileButton(props: fileButtonPropsExtend) {
  const { label, error, helperText, ...restProps } = props;
  return (
    <Box mt={"xs"}>
      <FileButton {...restProps}>{(props) => <Button {...props}>{label}</Button>}</FileButton>
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

/** @deprecated Use `DateTimePicker` from "@component/ui/date-picker" */
export function ContainedDateTimePickerInput(props: DateTimePickerProps) {
  return <DateTimePicker classNames={classes} getDayProps={getDayProps} {...props} />;
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
/** @deprecated Use `DatePicker` from "@component/ui/date-picker" */
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

/** @deprecated Use `MultiSelect` from "@component/ui/multi-select" */
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

/** @deprecated Use `TagsInput` from "@component/ui/tags-input" */
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

/** @deprecated Use `JsonInput` from "@component/ui/json-input" */
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
