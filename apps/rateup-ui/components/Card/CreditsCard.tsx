import { Anchor, Box, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import React from "react";

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
  let auther = "";
  let username = "";
  if (typeof url === "string") {
    params = new URLSearchParams(url?.split("?")[1]);
    auther = params.get("auther");
    username = params.get("username");
  }
  const isMobile = useMediaQuery("(max-width: 480px)");

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
          Photo by{" "}
          <Anchor
            href={`https://unsplash.com/@${username}?utm_source=Rateup&utm_medium=referral`}
            target="_blank"
            fz={fz}
          >
            {auther}
          </Anchor>{" "}
          on{" "}
          <Anchor
            href={"https://unsplash.com/?utm_source=Rateup&utm_medium=referral"}
            target="_blank"
            fz={fz}
          >
            Unsplash
          </Anchor>
        </Text>
      )}
    </Box>
  );
};
