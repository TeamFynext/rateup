import { Box, Flex, Stack } from "@mantine/core";
import React from "react";

export const SkeletonMenuCard = ({ isMobile }) => {
  const boxes = [
    { h: 5, w: 42 },
    { h: 1.5, w: 42 },
    { h: 1.5, w: 53 },
    { h: 1.5, w: 70 },
  ];
  return (
    <Box
      h={39}
      w={isMobile ? "100%" : 115}
      style={{
        backgroundColor: "var(--light-grey-color-3)",
        borderRadius: "3px",
      }}
      mb={"2px"}
    >
      <Flex align={"center"}>
        <Box
          h={33}
          w={33}
          m={3}
          style={{
            backgroundColor: "var(--light-grey-color-2)",
            borderRadius: "2.2px",
          }}
        />

        <Stack gap={"6px"}>
          {boxes?.map((box, index) => (
            <Box
              key={index}
              h={box?.h}
              w={box?.w}
              style={{
                backgroundColor: "var(--light-grey-color-2)",
                borderRadius: "3px",
              }}
            />
          ))}
        </Stack>
      </Flex>
    </Box>
  );
};
