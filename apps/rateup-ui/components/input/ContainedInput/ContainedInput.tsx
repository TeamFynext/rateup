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
} from "@mantine/core";
import classes from "./ContainedInput.module.css";

export function ContainedTextField(props: TextInputProps) {
  return <TextInput classNames={classes} {...props} />;
}
export function ContainedTextArea(props: TextareaProps) {
  return <Textarea classNames={classes} {...props}/>;
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

export function ContainedFileInput(props: FileInputProps) {
  return <FileInput classNames={classes} {...props} />;
}
