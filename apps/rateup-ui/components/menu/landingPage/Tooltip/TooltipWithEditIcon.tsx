import { Stack, ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import React from "react";
import classes from "./Tooltip.module.css";

export const TooltipWithEditIcon = ({
  handleEditIcon,
  tooltipLabel,
  children,
}: {
  handleEditIcon: (e: any) => void;
  tooltipLabel: string;
  children: any;
}) => {
  return (
    <Box className={classes.parentContainer}>
      <Tooltip label={tooltipLabel}>
        <Stack gap={0}>
          <ActionIcon
            variant="default"
            radius="lg"
            size="sm"
            onClick={handleEditIcon}
            className={classes.actionIcon}
          >
            <IconEdit style={{ width: "70%", height: "70%" }} />
          </ActionIcon>
          {children}
        </Stack>
      </Tooltip>
    </Box>
  );
};
