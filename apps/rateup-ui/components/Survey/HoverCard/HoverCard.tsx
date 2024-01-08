import React from "react";
import { HoverCard, Text } from "@mantine/core";

export const HoverCardComponent = ({ content, fw = 300, fz = "md" }) => {
  return (
    <HoverCard
      width={"fit-content"}
      shadow="md"
      withArrow
      styles={{ dropdown: { maxWidth: 400 } }}
      position="bottom-start"
    >
      <HoverCard.Target>
        <Text c="dark.3" truncate="end" miw={200} maw={200} fw={fw} fz={fz}>
          {content}
        </Text>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text
          c="dark.3"
          size="sm"
          style={{
            wordBreak: "break-word",
          }}
        >
          {content}
        </Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
