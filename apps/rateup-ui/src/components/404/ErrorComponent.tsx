import { Box, Container, Image, Stack, Text, Title } from "@mantine/core";
import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import React from "react";

import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { RateupButtonPrimary } from "../Button/RateupButtons.tsx";

type ErrorComponentProps = {
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<any, Error>>;
  isRefetching?: boolean;
};
const ErrorComponent = ({ refetch, isRefetching }: ErrorComponentProps) => {
  return (
    <Container
      flex={1}
      style={{
        display: "grid",
        placeContent: "center",
      }}
      h={"100%"}
    >
      <Stack ta={"center"} gap={4} h={"100%"} justify="center">
        <Image
          src={getFileUrlFromKey("/images/error-img.svg", false)}
          alt="Error Image"
          h={220}
          w={300}
        />
        <Title
          order={1}
          style={{
            fontWeight: "bold",
            letterSpacing: "tight",
            color: "black",
          }}
        >
          Uh-oh!
        </Title>
        <Text
          style={{
            color: "gray",
          }}
        >
          Something Went Wrong.
        </Text>
        <Box mt={"xs"}>
          <RateupButtonPrimary
            title="Try Again"
            onClick={refetch}
            variant="outline"
            loading={isRefetching}
          />
        </Box>
      </Stack>
    </Container>
  );
};

export default ErrorComponent;
