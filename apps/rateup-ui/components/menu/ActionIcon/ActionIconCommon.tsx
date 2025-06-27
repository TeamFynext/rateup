import { JSX } from "react";

import { ActionIcon, Stack, Tooltip } from "@mantine/core";

type ActionIconCommonProps = {
  handleClick: (e: any) => void;
  disabled?: boolean;
  label: string;
  children: JSX.Element;
};
export const ActionIconCommon = ({
  handleClick,
  label,
  children,
  disabled,
}: ActionIconCommonProps) => {
  return (
    <Stack
      bg={"white"}
      style={{
        borderRadius: "100%",
      }}
      w={"min-content"}
    >
      <ActionIcon
        variant="light"
        onClick={handleClick}
        radius={"lg"}
        disabled={disabled}
      >
        <Tooltip label={label}>{children}</Tooltip>
      </ActionIcon>
    </Stack>
  );
};
