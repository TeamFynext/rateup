"use client";

import React from "react";

import { NumberInput, TextInput } from "@mantine/core";

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  placeholder = "search...",
  type = "text",
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
  placeholder?: string;
  type?: string;
}) => {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value]);

  return type === "text" ? (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  ) : (
    <NumberInput
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(Number(e))}
    />
  );
};
export default DebouncedInput;
