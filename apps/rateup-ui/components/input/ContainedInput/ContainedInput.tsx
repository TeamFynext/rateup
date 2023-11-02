import React from "react";
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
} from "@mantine/core";
import classes from "./ContainedInput.module.css";

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
