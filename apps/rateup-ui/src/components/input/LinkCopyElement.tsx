"use client";

import type { TextInputProps } from "@mantine/core";
import { ActionIcon, CopyButton, TextInput } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface LinkCopyElementProps extends TextInputProps {
  link: string;
}
export function LinkCopyElement({
  link,
  label,
  ...props
}: LinkCopyElementProps) {
  const { t: translations } = useTranslation();
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
