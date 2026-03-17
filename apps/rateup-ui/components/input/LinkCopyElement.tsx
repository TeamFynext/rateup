"use client";

import {
  ActionIcon,
  CopyButton,
  TextInput,
  TextInputProps,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

interface LinkCopyElementProps extends TextInputProps {
  link: string;
}
export function LinkCopyElement({
  link,
  label,
  ...props
}: LinkCopyElementProps) {
  const translations = useExtracted();
  return (
    <TextInput
      label={label ?? translations("Register URL")}
      readOnly
      value={link}
      rightSection={
        <CopyButton value={link}>
          {({ copied, copy }) => (
            <ActionIcon
              variant={"subtle"}
              onClick={copy}
              disabled={props.disabled}
            >
              {copied ? <IconCheck color={"teal"} /> : <IconCopy />}
            </ActionIcon>
          )}
        </CopyButton>
      }
      {...props}
    />
  );
}
