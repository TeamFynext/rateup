import React, { useRef } from "react";
import {
  Select,
  TextInput,
  SelectProps,
  TextInputProps,
  PasswordInput,
  PasswordInputProps,
  FileInputProps,
  FileInput,
  Textarea,
  TextareaProps,
  NumberInputProps,
  NumberInput,
  ColorInput,
  ColorInputProps,
  ActionIcon,
  rem,
} from "@mantine/core";
import classes from "./ContainedInput.module.css";
import { TimeInput, TimeInputProps } from "@mantine/dates";
import { IconClock } from "@tabler/icons-react";

export function ContainedTextField(props: TextInputProps) {
  return <TextInput classNames={classes} {...props} />;
}
export function ContainedTextArea(props: TextareaProps) {
  return <Textarea classNames={classes} {...props} />;
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

export const ContainedFileInput = React.forwardRef(
  (props: FileInputProps, ref: React.Ref<HTMLButtonElement>) => {
    return <FileInput ref={ref} classNames={classes} {...props} />;
  },
);

export function ContainedNumberInput(props: NumberInputProps) {
  return <NumberInput classNames={classes} {...props} />;
}

export function ContainedColorInput(props: ColorInputProps) {
  return <ColorInput disallowInput classNames={classes} {...props} />;
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
