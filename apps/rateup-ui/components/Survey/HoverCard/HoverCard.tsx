import React from "react";

import {
  Badge,
  Box,
  HoverCard,
  Image,
  ScrollAreaAutosize,
  Text,
} from "@mantine/core";
import { useTranslations } from "next-intl";

import { QuestionType } from "../../../types/enums";
import { extractText, isHtml } from "../../../utils";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";

export const HoverCardComponent = ({
  content,
  fw = 300,
  fz = "md",
  c = "",
  lineClamp = 1,
  questionType = null,
}) => {
  const translations = useTranslations();
  if (questionType && !Object.values(QuestionType).includes(questionType))
    return (
      <Badge variant={"light"} color="red">
        {translations("Not Available")}
      </Badge>
    );
  return (
    <HoverCard
      width={"fit-content"}
      shadow="md"
      withArrow
      styles={{ dropdown: { maxWidth: 400 } }}
      position="bottom-start"
    >
      {[QuestionType.MultiTextInput, QuestionType.MCQGrid].includes(
        questionType,
      ) && content?.length > 0 ? (
        <HoverCard.Target>
          <Text c={c} miw={200} maw={200} fw={fw} fz={fz} lineClamp={lineClamp}>
            {content[0]}
          </Text>
        </HoverCard.Target>
      ) : (
        <HoverCard.Target>
          {typeof content === "object" ? (
            <Image
              src={getFileUrlFromKey(content?.value?.image)}
              w={30}
              alt={translations("answer image of question")}
            />
          ) : (
            <Text
              c={c}
              miw={200}
              maw={200}
              fw={fw}
              fz={fz}
              lineClamp={lineClamp}
            >
              {getContent(content)}
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
            {[QuestionType.MultiTextInput, QuestionType.MCQGrid].includes(
              questionType,
            ) ? (
              content?.length > 0 &&
              content?.map((c) => (
                <Text c={c} miw={200} maw={200} fw={fw} fz={fz} key={c}>
                  {c}
                </Text>
              ))
            ) : typeof content === "object" ? (
              <>
                <Image
                  src={getFileUrlFromKey(content?.value?.image)}
                  w={200}
                  alt={translations("answer image of question")}
                />
                <Text c={c} truncate="end" miw={200} maw={200} fw={fw} fz={fz}>
                  {content?.value?.value}
                </Text>
              </>
            ) : (
              <Text c={c} miw={200} fw={fw} fz={fz}>
                {getContent(content)}
              </Text>
            )}
          </Box>
        </ScrollAreaAutosize>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
const getContent = (title: string | boolean) => {
  if (typeof title === "boolean") return title?.toString();
  else if (isHtml(title)) return extractText(title);
  else return title;
};
