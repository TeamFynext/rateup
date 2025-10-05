import React, { ReactNode } from "react";

import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

const CopyIcon = ({
  children,
  value,
  timeout,
}: {
  children: ReactNode;
  value: string;
  timeout?: number;
}) => {
  return (
    <div className="flex gap-1 items-center">
      {children}
      <CopyButton value={value} timeout={timeout}>
        {({ copied, copy }) => (
          <Tooltip
            label={copied ? "Copied" : "Copy"}
            withArrow
            position="right"
          >
            <ActionIcon
              color={copied ? "teal" : "gray"}
              variant="subtle"
              onClick={copy}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </div>
  );
};

export default CopyIcon;
