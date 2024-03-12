import { Tooltip, TooltipProps } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";

export function HelpTooltip(props: Omit<TooltipProps, "children">) {
  return (
    <Tooltip onClick={(e) => e.stopPropagation()} {...props}>
      <IconHelpCircle />
    </Tooltip>
  );
}
