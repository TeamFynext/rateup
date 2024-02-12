import { Anchor, Box, Text } from "@mantine/core";
import React from "react";

type CreditsCardProps = {
  enableCredits: boolean;
  url: string | File;
  children: React.ReactNode;
  sx?: React.CSSProperties;
  fz?: number | string;
};
export const CreditsCard = ({
  enableCredits,
  url,
  children,
  sx = undefined,
  fz = 16,
}: CreditsCardProps) => {
  let params;
  let auther = "";
  let username = "";
  if (typeof url === "string") {
    params = new URLSearchParams(url?.split("?")[1]);
    auther = params.get("auther");
    username = params.get("username");
  }
  return (
    <Box pos={"relative"} p={0} m={0} w={"100%"} h={"100%"} style={sx}>
      {children}
      {enableCredits && (
        <Text
          pos={"absolute"}
          bottom={0}
          left={0}
          c={"white"}
          px={fz === 16 ? "xs" : 0}
          fz={fz}
          style={{
            background: "rgba( 255, 255, 255, 0.25 )",
            boxShadow: "0 8px 32px 0 rgba( 31, 38, 135, 0.37 )",
            backdropFilter: "blur( 4px )",
            WebkitBackdropFilter: "blur( 4px )",
            border: "1px solid rgba( 255, 255, 255, 0.18 )",
          }}
        >
          Photo by{" "}
          <Anchor
            href={`${process.env.NEXT_PUBLIC_UNSPLASH_SITE_URL}@${username}`}
            target="_blank"
            fz={fz}
          >
            {auther}
          </Anchor>{" "}
          on{" "}
          <Anchor
            href={process.env.NEXT_PUBLIC_UNSPLASH_SITE_URL}
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
