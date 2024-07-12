import { Image, Stack, Container, Text, Title, Box } from "@mantine/core";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import React from "react";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";

type ErrorComponentProps = {
  refetch: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<any, Error>>;
};
const ErrorComponent = ({ refetch }: ErrorComponentProps) => {
  return (
    <Container flex={1}>
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
          />
        </Box>
      </Stack>
    </Container>
  );
};

export default ErrorComponent;
