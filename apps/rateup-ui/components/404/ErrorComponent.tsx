import { Image, Stack } from "@mantine/core";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import React from "react";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { Container, Text, Title, Box } from "@mantine/core";

type ErrorComponentProps = {
  refetch: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<any, Error>>;
};
const ErrorComponent = ({ refetch }: ErrorComponentProps) => {
  return (
    <Container flex={1}>
      <Stack ta={"center"} gap={4} h={"100%"} justify="center">
        <Image src={"/images/error-img.svg"} alt="image for error" />
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
