import { ActionIcon, Stack, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

type ActionIconCommonProps = {
  handleClick: () => void;
  disabled?: boolean;
};
export const ActionIconCommon = ({
  handleClick,
  disabled = false,
}: ActionIconCommonProps) => {
  return (
    <Stack
      bg={"white"}
      h={"min-content"}
      style={{
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <ActionIcon
        radius={"md"}
        onClick={handleClick}
        variant="subtle"
        disabled={disabled}
        style={{
          border:
            "calc(0.0625rem * var(--mantine-scale)) solid var(--mantine-color-default-border)",
        }}
      >
        <Tooltip label="Delete">
          <IconTrash stroke={1.5} />
        </Tooltip>
      </ActionIcon>
    </Stack>
  );
};
