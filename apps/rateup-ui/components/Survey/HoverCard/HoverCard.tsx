import React from "react";
import { Box, HoverCard, Image, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";

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
        {typeof content === "object" ? (
          <Image src={getFileUrlFromKey(content?.value?.image)} w={30} />
        ) : (
          <Text c="dark.3" truncate="end" miw={200} maw={200} fw={fw} fz={fz}>
            {content}
          </Text>
        )}
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Box
          c="dark.3"
          size="sm"
          style={{
            wordBreak: "break-word",
          }}
        >
          {typeof content === "object" ? (
            <>
              <Image src={getFileUrlFromKey(content?.value?.image)} w={200} />
              <Text
                c="dark.3"
                truncate="end"
                miw={200}
                maw={200}
                fw={fw}
                fz={fz}
              >
                {content?.value?.value}
              </Text>
            </>
          ) : (
            <Text c="dark.3" miw={200} fw={fw} fz={fz}>
              {content}
            </Text>
          )}
        </Box>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
