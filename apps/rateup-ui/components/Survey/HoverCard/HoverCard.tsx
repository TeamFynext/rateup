import React from "react";
import { Box, HoverCard, Image, ScrollAreaAutosize, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { QuestionType } from "../../../types/enums";

export const HoverCardComponent = ({
  content,
  fw = 300,
  fz = "md",
  c = "dark.3",
  lineClamp = 1,
  questionType = null,
}) => {
  return (
    <HoverCard
      width={"fit-content"}
      shadow="md"
      withArrow
      styles={{ dropdown: { maxWidth: 400 } }}
      position="bottom-start"
    >
      {[QuestionType.Address].includes(questionType) && content?.length > 0 ? (
        <HoverCard.Target>
          <Text c={c} miw={200} maw={200} fw={fw} fz={fz} lineClamp={lineClamp}>
            {content[0]}
          </Text>
        </HoverCard.Target>
      ) : (
        <HoverCard.Target>
          {typeof content === "object" ? (
            <Image src={getFileUrlFromKey(content?.value?.image)} w={30} />
          ) : (
            <Text
              c={c}
              miw={200}
              maw={200}
              fw={fw}
              fz={fz}
              lineClamp={lineClamp}
            >
              {typeof content === "boolean" ? content.toString() : content}
            </Text>
          )}
        </HoverCard.Target>
      )}
      <HoverCard.Dropdown>
        <ScrollAreaAutosize>
          <Box
            c={c}
            size="sm"
            style={{
              wordBreak: "break-word",
            }}
            mah={250}
          >
            {[QuestionType.Address].includes(questionType) ? (
              content?.length > 0 &&
              content?.map((c) => (
                <Text c={c} miw={200} maw={200} fw={fw} fz={fz}>
                  {c}
                </Text>
              ))
            ) : typeof content === "object" ? (
              <>
                <Image src={getFileUrlFromKey(content?.value?.image)} w={200} />
                <Text c={c} truncate="end" miw={200} maw={200} fw={fw} fz={fz}>
                  {content?.value?.value}
                </Text>
              </>
            ) : (
              <Text c={c} miw={200} fw={fw} fz={fz}>
                {typeof content === "boolean" ? content.toString() : content}
              </Text>
            )}
          </Box>
        </ScrollAreaAutosize>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
