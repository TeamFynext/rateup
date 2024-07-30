import React from "react";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";

const InfoButton = ({ docUrl, className = "" }) => {
  return (
    <Tooltip label="Visit documentation" position="top" withArrow>
      <ActionIcon
        className={className}
        variant="light"
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          window.open(docUrl, "_blank");
        }}
      >
        <IconBook style={{ width: "100%", height: "100%" }} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
};

export default InfoButton;
