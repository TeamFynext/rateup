"use client";

import React from "react";

import { Anchor, Box, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslations } from "next-intl";

type CreditsCardProps = {
  enableCredits: boolean;
  url: string | File;
  children: React.ReactNode;
  sx?: React.CSSProperties;
  fz?: number | string;
  pl?: number | string;
};
export const CreditsCard = ({
  enableCredits,
  url,
  children,
  sx = undefined,
  fz = 9,
  pl = 0,
}: CreditsCardProps) => {
  let params;
  let author = "";
  let username = "";
  if (typeof url === "string") {
    params = new URLSearchParams(url?.split("?")[1]);
    author = params.get("author");
    username = params.get("username");
  }
  const isMobile = useMediaQuery("(max-width: 480px)");
  const translations = useTranslations();
  return (
    <Box pos={"relative"} p={0} m={0} w={"100%"} h={"100%"} style={sx}>
      {children}
      {enableCredits && (
        <Text
          pos={"absolute"}
          bottom={0}
          left={0}
          c={"white"}
          px={fz === 9 ? "xs" : 0}
          fz={fz}
          w={isMobile ? 120 : "100%"}
          style={{
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
          }}
          pl={pl}
        >
          {translations("Photo by")}
          <Anchor
            href={`https://unsplash.com/@${username}?utm_source=Rateup&utm_medium=referral`}
            target="_blank"
            fz={fz}
          >
            {author}
          </Anchor>{" "}
          {translations("on")}
          <Anchor
            href={"https://unsplash.com/?utm_source=Rateup&utm_medium=referral"}
            target="_blank"
            fz={fz}
          >
            {translations("Unsplash")}
          </Anchor>
        </Text>
      )}
    </Box>
  );
};
