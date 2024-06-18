import { ActionIcon, Tooltip } from "@mantine/core";
import { IconInfoSquareRounded } from "@tabler/icons-react";
import React from "react";

const InfoButton = ({ docUrl }) => {
  return (
    <Tooltip label="Visit documentation">
      <ActionIcon
        variant="light"
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          window.open(docUrl, "_blank");
        }}
      >
        <IconInfoSquareRounded
          style={{ width: "100%", height: "100%" }}
          stroke={1.5}
        />
      </ActionIcon>
    </Tooltip>
  );
};

export default InfoButton;
