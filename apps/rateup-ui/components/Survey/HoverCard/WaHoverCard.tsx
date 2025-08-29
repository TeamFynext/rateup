"use client";

import React from "react";

import { Box, HoverCard, Image, ScrollAreaAutosize, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

import { WaQuestions } from "@/types/enums";

export const WaHoverCardComponent = ({
  content,
  fw = 300,
  fz = "sm",
  c = "",
  lineClamp = 1,
  type,
}) => {
  const translations = useTranslations();
  return (
    <HoverCard
      width={"fit-content"}
      shadow="md"
      withArrow
      styles={{ dropdown: { maxWidth: 400 } }}
      position="bottom-start"
    >
      <HoverCard.Target>
        {type === WaQuestions.PhotoPicker ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${content}`}
            w={30}
            h={40}
            loading="lazy"
            alt={translations("answer image of question")}
          />
        ) : (
          <Text c={c} miw={200} maw={200} fw={fw} fz={fz} lineClamp={lineClamp}>
            {content}
          </Text>
        )}
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <ScrollAreaAutosize>
          {type === WaQuestions.PhotoPicker ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${content}`}
              w={200}
              alt={translations("answer image of question")}
              loading="lazy"
            />
          ) : (
            <Box
              c={c}
              size="sm"
              style={{
                wordBreak: "break-word",
              }}
              mah={250}
            >
              <Text c={c} miw={200} fw={fw} fz={fz}>
                {content}
              </Text>
            </Box>
          )}
        </ScrollAreaAutosize>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
